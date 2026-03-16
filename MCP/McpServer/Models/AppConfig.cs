using System.Text.Json.Serialization;

namespace McpServer.Models;

/// <summary>
/// Persisted server configuration – mirrors the shape expected by the management UI.
/// </summary>
public record AppConfig
{
    [JsonPropertyName("access_enabled")]
    public bool AccessEnabled { get; init; } = true;

    [JsonPropertyName("data_source")]
    public string DataSource { get; init; } = "local";

    [JsonPropertyName("data_source_url")]
    public string DataSourceUrl { get; init; } = string.Empty;
}
