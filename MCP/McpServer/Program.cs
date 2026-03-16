using System.Net.WebSockets;
using McpServer.Data;
using McpServer.Models;
using McpServer.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<ConfigService>();
builder.Services.AddSingleton<LogBroadcaster>();
builder.Services.AddSingleton<ProjectRepository>();
builder.Services.AddSingleton<McpSessionManager>();

var app = builder.Build();

// ── Static files (serves MCP/index.html as default page) ─────────────────────
app.UseDefaultFiles();
app.UseStaticFiles();

// ── WebSockets ────────────────────────────────────────────────────────────────
app.UseWebSockets();

// Live log stream consumed by the management UI
app.Map("/ws/logs", async (HttpContext ctx) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    var ws       = await ctx.WebSockets.AcceptWebSocketAsync();
    var caster   = ctx.RequestServices.GetRequiredService<LogBroadcaster>();
    await caster.HandleClientAsync(ws, ctx.RequestAborted);
});

// ── Config API ────────────────────────────────────────────────────────────────
app.MapGet("/api/config", async (ConfigService cfgSvc) =>
{
    var cfg = await cfgSvc.GetAsync();
    return Results.Ok(cfg);
});

app.MapPost("/api/config", async (ConfigService cfgSvc, HttpRequest req) =>
{
    AppConfig? cfg;
    try   { cfg = await req.ReadFromJsonAsync<AppConfig>(); }
    catch { return Results.BadRequest("Invalid JSON body."); }

    if (cfg is null) return Results.BadRequest("Missing configuration body.");

    await cfgSvc.SaveAsync(cfg);
    return Results.Ok();
});

// ── Workspace API ─────────────────────────────────────────────────────────────
app.MapPost("/api/workspace/load-example", async (ProjectRepository repo, LogBroadcaster log) =>
{
    var (success, message) = await repo.LoadExampleAsync();
    await log.LogAsync(success ? "INFO" : "WARNING", $"Workspace load-example: {message}");
    return success ? Results.Ok(new { message }) : Results.UnprocessableEntity(new { message });
});

app.MapPost("/api/workspace/load", async (ProjectRepository repo, LogBroadcaster log, HttpRequest req) =>
{
    var body = await req.ReadFromJsonAsync<WorkspaceLoadRequest>();
    if (body is null || string.IsNullOrWhiteSpace(body.Path))
        return Results.BadRequest("Missing 'path' field.");

    var (success, message) = await repo.LoadFromFileAsync(body.Path);
    await log.LogAsync(success ? "INFO" : "WARNING", $"Workspace load: {message}");
    return success ? Results.Ok(new { message }) : Results.UnprocessableEntity(new { message });
});

app.MapPost("/api/workspace/upload", async (ProjectRepository repo, LogBroadcaster log, HttpRequest req) =>
{
    if (!req.HasFormContentType || req.Form.Files.Count == 0)
        return Results.BadRequest("Expected a multipart/form-data file upload.");

    var file = req.Form.Files[0];
    if (!file.FileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        return Results.BadRequest("Only .json files are accepted.");

    using var reader = new StreamReader(file.OpenReadStream());
    var json = await reader.ReadToEndAsync();

    var (success, message) = await repo.LoadFromJsonAsync(json);
    await log.LogAsync(success ? "INFO" : "WARNING", $"Workspace upload: {message}");
    return success ? Results.Ok(new { message }) : Results.UnprocessableEntity(new { message });
});

app.MapGet("/api/workspace/summary", (ProjectRepository repo) =>
{
    var summary = repo.GetSummary();
    return summary is not null ? Results.Ok(summary) : Results.NoContent();
});

app.MapGet("/api/workspace/search", (ProjectRepository repo, string? q) =>
{
    if (string.IsNullOrWhiteSpace(q)) return Results.BadRequest("Missing query parameter 'q'.");
    return Results.Ok(repo.Search(q));
});

// ── MCP protocol (SSE transport, JSON-RPC 2.0) ───────────────────────────────
var mcp = app.Services.GetRequiredService<McpSessionManager>();
app.MapGet("/sse",      mcp.HandleSseAsync);
app.MapPost("/message", mcp.HandleMessageAsync);

app.Run();

// Local record used only for the workspace/load endpoint
record WorkspaceLoadRequest(string Path);
