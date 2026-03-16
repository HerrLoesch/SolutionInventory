using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace McpServer.Services;

/// <summary>
/// Maintains connected WebSocket clients and fans out structured log entries
/// to the management UI in real time.
/// </summary>
public sealed class LogBroadcaster
{
    private readonly List<WebSocket> _clients = [];
    private readonly object _lock = new();

    /// <summary>
    /// Keeps a WebSocket client connected until it disconnects or the token is cancelled.
    /// </summary>
    public async Task HandleClientAsync(WebSocket socket, CancellationToken ct)
    {
        lock (_lock) _clients.Add(socket);
        try
        {
            var buf = new byte[256];
            while (!ct.IsCancellationRequested && socket.State == WebSocketState.Open)
            {
                var result = await socket.ReceiveAsync(buf, ct);
                if (result.MessageType == WebSocketMessageType.Close) break;
                // client-side pings are intentionally ignored
            }
        }
        catch (OperationCanceledException) { }
        catch (WebSocketException) { }
        finally
        {
            lock (_lock) _clients.Remove(socket);
            try
            {
                if (socket.State == WebSocketState.Open)
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, null, CancellationToken.None);
            }
            catch { /* already closed */ }
        }
    }

    /// <summary>
    /// Broadcasts a log entry <c>{ts, level, msg}</c> to all connected UI clients.
    /// </summary>
    public async Task LogAsync(string level, string message)
    {
        var payload = JsonSerializer.Serialize(new
        {
            ts    = DateTime.Now.ToString("HH:mm:ss.fff"),
            level,
            msg   = message
        });

        var bytes = new ArraySegment<byte>(Encoding.UTF8.GetBytes(payload));

        List<WebSocket> snapshot;
        lock (_lock) snapshot = [.. _clients];

        var stale = new List<WebSocket>();
        foreach (var ws in snapshot)
        {
            if (ws.State != WebSocketState.Open) { stale.Add(ws); continue; }
            try
            {
                await ws.SendAsync(bytes, WebSocketMessageType.Text, endOfMessage: true, CancellationToken.None);
            }
            catch
            {
                stale.Add(ws);
            }
        }

        if (stale.Count > 0)
            lock (_lock) stale.ForEach(s => _clients.Remove(s));
    }
}
