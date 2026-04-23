using System.Collections.Concurrent;
using System.Text;
using System.Text.Json.Nodes;
using McpServer.Data;
using McpServer.Logic;
using Microsoft.AspNetCore.Http.Features;

namespace McpServer.Services;

/// <summary>
/// Implements the Model Context Protocol (MCP) over the SSE transport.
///
/// Flow:
///   1.  MCP client opens  GET /sse   → receives an SSE stream with an "endpoint" event.
///   2.  Client posts JSON-RPC messages to  POST /message?sessionId=&lt;id&gt;.
///   3.  Server replies via the SSE stream using "message" events.
///
/// Supported methods:
///   • initialize   – handshake / capability exchange
///   • tools/list   – enumerate available tools
///   • tools/call   – invoke a tool
///   • ping         – keep-alive (MCP spec)
/// </summary>
public sealed class McpSessionManager
{
    // ── Inner type ────────────────────────────────────────────────────────────

    private sealed class Session(string id, Func<string, Task> send)
    {
        public string Id { get; } = id;
        public Func<string, Task> Send { get; } = send;
    }

    // ── State ─────────────────────────────────────────────────────────────────

    private readonly ConcurrentDictionary<string, Session> _sessions = new();
    private readonly ConfigService          _config;
    private readonly LogBroadcaster         _log;
    private readonly ProjectRepository      _repo;
    private readonly QuestionnaireEvaluator _evaluator;

    public McpSessionManager(ConfigService config, LogBroadcaster log, ProjectRepository repo, QuestionnaireEvaluator evaluator)
    {
        _config    = config;
        _log       = log;
        _repo      = repo;
        _evaluator = evaluator;
    }

    // ── SSE endpoint  GET /sse ────────────────────────────────────────────────

    public async Task HandleSseAsync(HttpContext ctx)
    {
        var cfg = await _config.GetAsync();
        if (!cfg.AccessEnabled)
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsync("MCP access is disabled.");
            return;
        }

        ctx.Response.ContentType = "text/event-stream; charset=utf-8";
        ctx.Response.Headers.CacheControl = "no-cache";

        // Disable response buffering so events are flushed immediately.
        ctx.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

        var sessionId = Guid.NewGuid().ToString("N");
        var ct        = ctx.RequestAborted;

        async Task SendEvent(string ev, string data)
        {
            await ctx.Response.WriteAsync($"event: {ev}\ndata: {data}\n\n", ct);
            await ctx.Response.Body.FlushAsync(ct);
        }

        _sessions[sessionId] = new Session(sessionId, json => SendEvent("message", json));
        await _log.LogAsync("INFO", $"MCP session opened [{sessionId[..8]}…]");

        try
        {
            // Tell the client where to send its JSON-RPC messages.
            await SendEvent("endpoint", $"/message?sessionId={sessionId}");

            // Send periodic keep-alives to prevent proxy timeouts.
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            while (await timer.WaitForNextTickAsync(ct))
            {
                await ctx.Response.WriteAsync(": keepalive\n\n", ct);
                await ctx.Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException) { }
        finally
        {
            _sessions.TryRemove(sessionId, out _);
            await _log.LogAsync("INFO", $"MCP session closed [{sessionId[..8]}…]");
        }
    }

    // ── Message endpoint  POST /message?sessionId=… ───────────────────────────

    public async Task HandleMessageAsync(HttpContext ctx)
    {
        var cfg = await _config.GetAsync();
        if (!cfg.AccessEnabled)
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        var sessionId = ctx.Request.Query["sessionId"].ToString();
        if (string.IsNullOrEmpty(sessionId) || !_sessions.TryGetValue(sessionId, out var session))
        {
            ctx.Response.StatusCode = StatusCodes.Status404NotFound;
            await ctx.Response.WriteAsync("Session not found.");
            return;
        }

        JsonNode? body;
        try   { body = await JsonNode.ParseAsync(ctx.Request.Body); }
        catch
        {
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        if (body is null)
        {
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        // Accept immediately; actual response is delivered via SSE.
        ctx.Response.StatusCode = StatusCodes.Status202Accepted;

        _ = Task.Run(async () =>
        {
            try   { await DispatchAsync(session, body); }
            catch (Exception ex) { await _log.LogAsync("ERROR", ex.Message); }
        });
    }

    // ── Request dispatcher ────────────────────────────────────────────────────

    private async Task DispatchAsync(Session session, JsonNode body)
    {
        var method  = body["method"]?.GetValue<string>() ?? string.Empty;
        var id      = body["id"];
        var @params = body["params"];

        // Notifications (no id) require no response.
        if (id is null)
        {
            await _log.LogAsync("INFO", $"MCP notification: {method}");
            return;
        }

        await _log.LogAsync("INFO", $"MCP ← {method}");

        // For tools/call also log the specific tool name
        if (method == "tools/call")
        {
            var toolName = @params?["name"]?.GetValue<string>() ?? "?";
            await _log.LogAsync("INFO", $"  tool: {toolName}");
        }

        var response = method switch
        {
            "initialize" => BuildInitializeResponse(id),
            "tools/list" => BuildToolListResponse(id),
            "tools/call" => await BuildToolCallResponseAsync(id, @params),
            "ping"       => BuildResponse(id, new JsonObject()),
            _            => BuildError(id, -32601, $"Method not found: {method}")
        };

        await _log.LogAsync("INFO", $"MCP → {method} (replied)");
        await session.Send(response);
    }

    // ── Direct (sessionless) tool-call endpoint  POST /api/tool/call ─────────────────
    //
    // Allows the mcp-bridge.js to invoke a tool without needing an active SSE
    // session. Returns the JSON-RPC "result" object directly as HTTP 200 JSON,
    // or HTTP 400 with the JSON-RPC error object on failure.

    public async Task HandleDirectToolCallAsync(HttpContext ctx)
    {
        var cfg = await _config.GetAsync();
        if (!cfg.AccessEnabled)
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        JsonNode? body;
        try   { body = await JsonNode.ParseAsync(ctx.Request.Body); }
        catch
        {
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            await ctx.Response.WriteAsync("Invalid JSON body.");
            return;
        }

        if (body is null)
        {
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            await ctx.Response.WriteAsync("Missing request body.");
            return;
        }

        var toolName = body["name"]?.GetValue<string>() ?? string.Empty;
        var args     = body["arguments"];

        await _log.LogAsync("INFO", $"MCP tool call (direct): {toolName}");

        var fakeId        = JsonValue.Create(1);
        var jsonRpcParams = new JsonObject
        {
            ["name"]      = toolName,
            ["arguments"] = args?.DeepClone()
        };

        var responseJson = await BuildToolCallResponseAsync(fakeId, jsonRpcParams);
        var parsed       = JsonNode.Parse(responseJson);

        ctx.Response.ContentType = "application/json";

        if (parsed?["error"] is JsonNode err)
        {
            var errMsg = err["message"]?.GetValue<string>() ?? "Unknown tool error";
            await _log.LogAsync("ERROR", $"Tool error [{toolName}]: {errMsg}");
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            await ctx.Response.WriteAsync(err.ToJsonString());
            return;
        }

        var result = parsed?["result"];
        await _log.LogAsync("INFO", $"MCP tool call completed: {toolName}");
        ctx.Response.StatusCode = StatusCodes.Status200OK;
        await ctx.Response.WriteAsync(result?.ToJsonString() ?? "{}");
    }

    // ── Response builders ─────────────────────────────────────────────────────

    private static string BuildInitializeResponse(JsonNode id) =>
        BuildResponse(id, new JsonObject
        {
            ["protocolVersion"] = "2024-11-05",
            ["capabilities"]    = new JsonObject { ["tools"] = new JsonObject() },
            ["serverInfo"]      = new JsonObject
            {
                ["name"]    = "SolutionInventory-MCP",
                ["version"] = "1.0.0"
            }
        });

    private static string BuildToolListResponse(JsonNode id) =>
        BuildResponse(id, new JsonObject
        {
            ["tools"] = new JsonArray
            {
                new JsonObject
                {
                    ["name"]        = "list_categories",
                    ["description"] = "Returns all distinct categories (and their subcategory entries with IDs) that exist across the loaded workspace. Use this to discover which category IDs and entry IDs are available before making other calls.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject(),
                        ["required"]   = new JsonArray()
                    }
                },
                new JsonObject
                {
                    ["name"]        = "list_questionnaires",
                    ["description"] = "Returns the structural outline of every questionnaire in the workspace: questionnaire ID, name, and the categories/subcategories (entry IDs and aspect labels) each one covers. No metadata, no answers.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject(),
                        ["required"]   = new JsonArray()
                    }
                },
                new JsonObject
                {
                    ["name"]        = "get_answers_for_category",
                    ["description"] = "Returns all answers given for a specific category across all questionnaires. Optionally filter by a specific subcategory entry (entryId) or a specific questionnaire (questionnaireId).",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject
                        {
                            ["categoryId"] = new JsonObject
                            {
                                ["type"]        = "string",
                                ["description"] = "The category ID to retrieve answers for, e.g. 'backend', 'frontend', 'architecture'."
                            },
                            ["entryId"] = new JsonObject
                            {
                                ["type"]        = "string",
                                ["description"] = "Optional. Filter to a specific subcategory entry by its ID, e.g. 'be-runtime', 'fe-apptype'."
                            },
                            ["questionnaireId"] = new JsonObject
                            {
                                ["type"]        = "string",
                                ["description"] = "Optional. Limit results to a single questionnaire by ID or name."
                            }
                        },
                        ["required"] = new JsonArray { "categoryId" }
                    }
                },
                new JsonObject
                {
                    ["name"]        = "get_tech_radar",
                    ["description"] = "Returns the project-level tech radar: all radar entries (with option, category, status, shortComment and description), grouped by status ring, and the radar category order.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject(),
                        ["required"]   = new JsonArray()
                    }
                },
                new JsonObject
                {
                    ["name"]        = "evaluate_responses",
                    ["description"] = "Evaluates the response quality of a single questionnaire. Returns a consistency_score (0.0–1.0) measuring internal consistency of answers, a completeness_% (0–100) representing the fraction of mandatory fields and entries that have been filled in, and a warnings array listing detected issues such as missing metadata, unanswered entries, conflicting technology statuses, or critical statuses (Hold/Retire) without explanatory comments.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject
                        {
                            ["questionnaire_id"] = new JsonObject
                            {
                                ["type"]        = "string",
                                ["description"] = "The unique identifier (ID or name) of the questionnaire to evaluate."
                            }
                        },
                        ["required"] = new JsonArray { "questionnaire_id" }
                    }
                },
                new JsonObject
                {
                    ["name"]        = "get_json_schema",
                    ["description"] = "Returns a JSON Schema (Draft-07) document describing a SolutionInventory data format. Use 'workspace' to get the schema for the complete workspace export file (project + questionnaires, including all category IDs, entry IDs, and valid enum values). Use 'questionnaire' to get the schema for a single standalone questionnaire document.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject
                        {
                            ["type"] = new JsonObject
                            {
                                ["type"]        = "string",
                                ["description"] = "The schema to retrieve: 'workspace' (full export format with project + questionnaires) or 'questionnaire' (single questionnaire document).",
                                ["enum"]        = new JsonArray { "workspace", "questionnaire" }
                            }
                        },
                        ["required"] = new JsonArray { "type" }
                    }
                }
            }
        });

    private async Task<string> BuildToolCallResponseAsync(JsonNode id, JsonNode? @params)
    {
        var toolName    = @params?["name"]?.GetValue<string>() ?? string.Empty;
        var args        = @params?["arguments"];
        var cfg         = await _config.GetAsync();
        var excludedIds = cfg.ExcludedQuestionnaireIds;
        var referenceId = cfg.ReferenceQuestionnaireId;

        return toolName switch
        {
            "list_categories"          => BuildListCategoriesResponse(id, excludedIds),
            "list_questionnaires"      => BuildListQuestionnairesResponse(id, excludedIds, referenceId),
            "get_answers_for_category" => BuildAnswersForCategoryResponse(id, args, excludedIds),
            "get_tech_radar"           => BuildTechRadarResponse(id),
            "evaluate_responses"       => BuildEvaluateResponsesResponse(id, args),
            "get_json_schema"          => BuildGetJsonSchemaResponse(id, args),
            _                          => BuildError(id, -32602, $"Unknown tool: {toolName}")
        };
    }

    private static string BuildTextToolResponse(JsonNode id, string text) =>
        BuildResponse(id, new JsonObject
        {
            ["content"] = new JsonArray
            {
                new JsonObject { ["type"] = "text", ["text"] = text }
            }
        });

    private string BuildListCategoriesResponse(JsonNode id, IReadOnlyList<string> excludedIds)
    {
        var categories = _repo.GetCategories(excludedIds);
        if (categories is null)
            return BuildTextToolResponse(id, NotLoadedMessage);

        var sb = new StringBuilder();
        sb.AppendLine($"# Categories ({categories.Count})");
        sb.AppendLine();

        foreach (var cat in categories)
        {
            sb.AppendLine($"## {cat.Title}  `{cat.Id}`");
            foreach (var entry in cat.Entries)
                sb.AppendLine($"  - `{entry.Id}` — {entry.Aspect}");
            sb.AppendLine();
        }

        return BuildTextToolResponse(id, sb.ToString());
    }

    private string BuildListQuestionnairesResponse(JsonNode id, IReadOnlyList<string> excludedIds, string? referenceId)
    {
        var structures = _repo.GetQuestionnaireStructures(excludedIds, referenceId);
        if (structures is null)
            return BuildTextToolResponse(id, NotLoadedMessage);

        var sb = new StringBuilder();
        sb.AppendLine($"# Questionnaires ({structures.Count})");

        var refQ = structures.FirstOrDefault(q => q.IsReference);
        if (refQ is not null)
        {
            sb.AppendLine();
            sb.AppendLine($"> ⭐ **Reference catalog:** **{refQ.Name}** (`{refQ.Id}`) — This catalog defines the official technology standards for this project. Its answers represent authoritative baseline decisions that apply to all other questionnaires.");
        }

        sb.AppendLine();

        foreach (var q in structures)
        {
            var heading = q.IsReference
                ? $"## ⭐ {q.Name}  `{q.Id}`  [REFERENCE CATALOG]"
                : $"## {q.Name}  `{q.Id}`";
            sb.AppendLine(heading);
            foreach (var cat in q.Categories)
            {
                sb.AppendLine($"  ### {cat.Title}  `{cat.Id}`  ({cat.Entries.Count} entries)");
                foreach (var entry in cat.Entries)
                    sb.AppendLine($"    - `{entry.Id}` — {entry.Aspect}");
            }
            sb.AppendLine();
        }

        return BuildTextToolResponse(id, sb.ToString());
    }

    private string BuildAnswersForCategoryResponse(JsonNode id, JsonNode? args, IReadOnlyList<string> excludedIds)
    {
        var categoryId      = args?["categoryId"]?.GetValue<string>();
        var entryId         = args?["entryId"]?.GetValue<string>();
        var questionnaireId = args?["questionnaireId"]?.GetValue<string>();

        if (string.IsNullOrWhiteSpace(categoryId))
            return BuildError(id, -32602, "Parameter 'categoryId' is required.");

        var records = _repo.GetAnswersForCategory(categoryId, entryId, questionnaireId, excludedIds);
        if (records is null)
            return BuildTextToolResponse(id, NotLoadedMessage);

        if (records.Count == 0)
            return BuildTextToolResponse(id, $"No answers found for category '{categoryId}'" +
                (entryId         is not null ? $", entry '{entryId}'"                     : "") +
                (questionnaireId is not null ? $", questionnaire '{questionnaireId}'"     : "") + ".");

        var sb = new StringBuilder();
        var header = $"# Answers for category `{categoryId}`";
        if (entryId         is not null) header += $" › `{entryId}`";
        if (questionnaireId is not null) header += $" (questionnaire: {questionnaireId})";
        sb.AppendLine(header);
        sb.AppendLine();

        // Group by questionnaire → category entry for readability
        foreach (var byQ in records.GroupBy(r => r.QuestionnaireName))
        {
            sb.AppendLine($"## {byQ.Key}");
            foreach (var byEntry in byQ.GroupBy(r => r.Aspect))
            {
                var first = byEntry.First();
                sb.Append($"  ### {byEntry.Key}  `{first.EntryId}`");
                if (!string.IsNullOrWhiteSpace(first.Applicability))
                    sb.Append($"  [{first.Applicability}]");
                sb.AppendLine();

                if (!string.IsNullOrWhiteSpace(first.EntryComment))
                    sb.AppendLine($"  > {first.EntryComment}");

                foreach (var r in byEntry.Where(r => r.Technology is not null))
                {
                    sb.Append($"    - **{r.Technology}** ({r.Status})");
                    if (!string.IsNullOrWhiteSpace(r.Comment))
                        sb.Append($" — {r.Comment}");
                    sb.AppendLine();
                }
            }
            sb.AppendLine();
        }

        return BuildTextToolResponse(id, sb.ToString());
    }

    private string BuildTechRadarResponse(JsonNode id)
    {
        var radar = _repo.GetTechRadar();
        if (radar is null)
            return BuildTextToolResponse(id, NotLoadedMessage);
        var sb = new StringBuilder();
        sb.AppendLine("# Tech Radar");
        sb.AppendLine();

        sb.AppendLine($"**Category order:** {string.Join(" › ", radar.CategoryOrder)}");
        sb.AppendLine();

        foreach (var group in radar.Entries.GroupBy(e => e.Status, StringComparer.OrdinalIgnoreCase))
        {
            var ring  = group.Key;
            var items = group.ToList();

            sb.AppendLine($"## {ring.ToUpper()}  ({items.Count})");
            foreach (var item in items)
            {
                sb.Append($"  - **{item.Option}** [{item.Category}]");
                if (!string.IsNullOrWhiteSpace(item.ShortComment)) sb.Append($" — {item.ShortComment}");
                sb.AppendLine();
                if (!string.IsNullOrWhiteSpace(item.Description))
                {
                    foreach (var line in item.Description.Split('\n', StringSplitOptions.RemoveEmptyEntries))
                        sb.AppendLine($"    > {line.Trim()}");
                }
            }
            sb.AppendLine();
        }

        return BuildTextToolResponse(id, sb.ToString());
    }

    private string BuildEvaluateResponsesResponse(JsonNode id, JsonNode? args)
    {
        var questionnaireId = args?["questionnaire_id"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(questionnaireId))
            return BuildError(id, -32602, "Parameter 'questionnaire_id' is required.");

        var questionnaire = _repo.FindQuestionnaire(questionnaireId);
        if (questionnaire is null)
        {
            return BuildTextToolResponse(id, _repo.IsLoaded
                ? $"No questionnaire found with ID or name '{questionnaireId}'."
                : NotLoadedMessage);
        }

        var result = _evaluator.Evaluate(questionnaire);

        var warningsArray = new JsonArray();
        foreach (var w in result.Warnings)
            warningsArray.Add(JsonValue.Create(w));

        var json = new JsonObject
        {
            ["consistency_score"] = result.ConsistencyScore,
            ["completeness_%"]    = result.CompletenessPercentage,
            ["warnings"]          = warningsArray
        };

        return BuildTextToolResponse(id, json.ToJsonString());
    }

    private static string BuildGetJsonSchemaResponse(JsonNode id, JsonNode? args)
    {
        var type   = args?["type"]?.GetValue<string>() ?? "workspace";
        var schema = type == "questionnaire" ? JsonSchemas.QuestionnaireSchema : JsonSchemas.WorkspaceSchema;
        return BuildTextToolResponse(id, $"```json\n{schema}\n```");
    }

    private const string NotLoadedMessage =
        "No workspace loaded. Use the management UI (Workspace tab → Load Example or Load File) to load a workspace first.";

    private static string BuildResponse(JsonNode id, JsonNode result) =>
        new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"]      = id.DeepClone(),
            ["result"]  = result
        }.ToJsonString();

    private static string BuildError(JsonNode id, int code, string message) =>
        new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"]      = id.DeepClone(),
            ["error"]   = new JsonObject
            {
                ["code"]    = code,
                ["message"] = message
            }
        }.ToJsonString();
}
