using System.Net.WebSockets;
using McpServer.Models;
using McpServer.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<ConfigService>();
builder.Services.AddSingleton<LogBroadcaster>();
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

// ── MCP protocol (SSE transport, JSON-RPC 2.0) ───────────────────────────────
var mcp = app.Services.GetRequiredService<McpSessionManager>();
app.MapGet("/sse",      mcp.HandleSseAsync);
app.MapPost("/message", mcp.HandleMessageAsync);

app.Run();
