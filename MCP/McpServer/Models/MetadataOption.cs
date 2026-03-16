using System.Text.Json.Serialization;

namespace McpServer.Models;

public record MetadataOption
{
    [JsonPropertyName("label")]
    public string Label { get; init; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; init; } = string.Empty;
}
