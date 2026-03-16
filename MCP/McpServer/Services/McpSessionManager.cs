using System.Collections.Concurrent;
using System.Text.Json.Nodes;
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
    private readonly ConfigService  _config;
    private readonly LogBroadcaster _log;

    public McpSessionManager(ConfigService config, LogBroadcaster log)
    {
        _config = config;
        _log    = log;
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
            "tools/call" => BuildToolCallResponse(id, @params),
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
                }
            }
        });

    private static string BuildToolCallResponse(JsonNode id, JsonNode? @params)
    {
        var toolName = @params?["name"]?.GetValue<string>() ?? string.Empty;
        return toolName switch
        {
            "get_current_time" => BuildResponse(id, new JsonObject
            {
                ["content"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["type"] = "text",
                        ["text"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    }
                }
            }),
            _ => BuildError(id, -32602, $"Unknown tool: {toolName}")
        };
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
