using System.Text.Json.Serialization;

namespace McpServer.Models;

public record EntryExample
{
    [JsonPropertyName("label")]
    public string Label { get; init; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; init; } = string.Empty;

    [JsonPropertyName("tools")]
    public List<string> Tools { get; init; } = [];
}
