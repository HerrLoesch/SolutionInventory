using System.Collections.Concurrent;
using System.Text;
using System.Text.Json.Nodes;
using McpServer.Data;
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
    private readonly ConfigService       _config;
    private readonly LogBroadcaster      _log;
    private readonly ProjectRepository   _repo;

    public McpSessionManager(ConfigService config, LogBroadcaster log, ProjectRepository repo)
    {
        _config = config;
        _log    = log;
        _repo   = repo;
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
                    ["name"]        = "get_current_time",
                    ["description"] = "Returns the current local date and time of the MCP server host.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject(),
                        ["required"]   = new JsonArray()
                    }
                },
                new JsonObject
                {
                    ["name"]        = "get_workspace_summary",
                    ["description"] = "Returns a summary of the loaded Solution Inventory workspace including the project name, questionnaire list and entry statistics.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject(),
                        ["required"]   = new JsonArray()
                    }
                },
                new JsonObject
                {
                    ["name"]        = "search_workspace",
                    ["description"] = "Searches the loaded workspace for questionnaires, technologies, answers and architectural decisions matching the given query.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject
                        {
                            ["query"] = new JsonObject
                            {
                                ["type"]        = "string",
                                ["description"] = "The search term to look for across questionnaire names, categories, entries, answers and examples."
                            }
                        },
                        ["required"] = new JsonArray { "query" }
                    }
                },
                new JsonObject
                {
                    ["name"]        = "get_questionnaire_detail",
                    ["description"] = "Returns full details for a specific questionnaire by its ID or name, including all categories, entries and answers.",
                    ["inputSchema"] = new JsonObject
                    {
                        ["type"]       = "object",
                        ["properties"] = new JsonObject
                        {
                            ["questionnaireId"] = new JsonObject
                            {
                                ["type"]        = "string",
                                ["description"] = "The ID or name of the questionnaire to retrieve."
                            }
                        },
                        ["required"] = new JsonArray { "questionnaireId" }
                    }
                }
            }
        });

    private Task<string> BuildToolCallResponseAsync(JsonNode id, JsonNode? @params)
    {
        var toolName = @params?["name"]?.GetValue<string>() ?? string.Empty;
        var args     = @params?["arguments"];

        return toolName switch
        {
            "get_current_time"        => Task.FromResult(BuildTextToolResponse(id, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"))),
            "get_workspace_summary"   => Task.FromResult(BuildWorkspaceSummaryResponse(id)),
            "search_workspace"        => Task.FromResult(BuildSearchResponse(id, args?["query"]?.GetValue<string>())),
            "get_questionnaire_detail"=> Task.FromResult(BuildQuestionnaireDetailResponse(id, args?["questionnaireId"]?.GetValue<string>())),
            _                         => Task.FromResult(BuildError(id, -32602, $"Unknown tool: {toolName}"))
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

    private string BuildWorkspaceSummaryResponse(JsonNode id)
    {
        var summary = _repo.GetSummary();
        if (summary is null)
            return BuildTextToolResponse(id, "No workspace loaded. Use the management UI to load a workspace first.");

        var sb = new StringBuilder();
        sb.AppendLine($"# Workspace: {summary.ProjectName}");
        sb.AppendLine($"Questionnaires: {summary.QuestionnaireCount}  |  Entries: {summary.TotalEntries}  |  Answers: {summary.TotalAnswers}");
        sb.AppendLine();

        foreach (var q in summary.Questionnaires)
        {
            sb.AppendLine($"## {q.Name}");
            if (!string.IsNullOrWhiteSpace(q.ProductName)) sb.AppendLine($"  Product: {q.ProductName}");
            if (!string.IsNullOrWhiteSpace(q.Company))     sb.AppendLine($"  Company: {q.Company}");
            if (!string.IsNullOrWhiteSpace(q.Department))  sb.AppendLine($"  Dept: {q.Department}");
            sb.AppendLine($"  Categories: {q.CategoryCount}  |  Entries: {q.EntryCount}");
        }

        return BuildTextToolResponse(id, sb.ToString());
    }

    private string BuildSearchResponse(JsonNode id, string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BuildError(id, -32602, "Parameter 'query' is required.");

        var response = _repo.Search(query);
        if (response.TotalCount == 0)
            return BuildTextToolResponse(id, $"No results found for '{query}'.");

        var sb = new StringBuilder();
        sb.AppendLine($"Found {response.TotalCount} result(s) for '{query}':");
        sb.AppendLine();

        foreach (var r in response.Results)
        {
            sb.Append($"[{r.MatchType.ToUpper()}] {r.QuestionnaireName}");
            if (!string.IsNullOrEmpty(r.CategoryTitle)) sb.Append($" › {r.CategoryTitle}");
            if (!string.IsNullOrEmpty(r.Aspect))        sb.Append($" › {r.Aspect}");
            sb.AppendLine();
            sb.Append($"  → {r.MatchText}");
            if (!string.IsNullOrEmpty(r.Applicability)) sb.Append($"  ({r.Applicability})");
            sb.AppendLine();
        }

        return BuildTextToolResponse(id, sb.ToString());
    }

    private string BuildQuestionnaireDetailResponse(JsonNode id, string? questionnaireId)
    {
        if (string.IsNullOrWhiteSpace(questionnaireId))
            return BuildError(id, -32602, "Parameter 'questionnaireId' is required.");

        var q = _repo.GetQuestionnaire(questionnaireId);
        if (q is null)
            return BuildTextToolResponse(id, $"Questionnaire '{questionnaireId}' not found.");

        var sb = new StringBuilder();
        sb.AppendLine($"# Questionnaire: {q.Name} ({q.Id})");
        sb.AppendLine();

        foreach (var cat in q.Categories)
        {
            sb.AppendLine($"## {cat.Title}");

            if (cat.IsMetadata == true && cat.Metadata is { } meta)
            {
                if (!string.IsNullOrWhiteSpace(meta.ProductName))     sb.AppendLine($"  Product: {meta.ProductName}");
                if (!string.IsNullOrWhiteSpace(meta.Company))         sb.AppendLine($"  Company: {meta.Company}");
                if (!string.IsNullOrWhiteSpace(meta.Department))      sb.AppendLine($"  Department: {meta.Department}");
                if (!string.IsNullOrWhiteSpace(meta.ContactPerson))   sb.AppendLine($"  Contact: {meta.ContactPerson}");
                if (!string.IsNullOrWhiteSpace(meta.ExecutionType))   sb.AppendLine($"  Execution type: {meta.ExecutionType}");
                if (!string.IsNullOrWhiteSpace(meta.ArchitecturalRole)) sb.AppendLine($"  Architectural role: {meta.ArchitecturalRole}");
            }

            foreach (var entry in cat.Entries ?? [])
            {
                sb.AppendLine($"  ### {entry.Aspect} [{entry.Applicability ?? "not set"}]");
                if (!string.IsNullOrWhiteSpace(entry.EntryComment)) sb.AppendLine($"    Note: {entry.EntryComment}");

                foreach (var ans in entry.Answers ?? [])
                    sb.AppendLine($"    - {ans.Technology}: {ans.Status}");
            }

            sb.AppendLine();
        }

        return BuildTextToolResponse(id, sb.ToString());
    }

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
