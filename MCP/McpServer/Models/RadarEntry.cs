using System.Text.Json.Serialization;

namespace McpServer.Models;

public record RadarEntry
{
    [JsonPropertyName("entryId")]
    public string EntryId { get; init; } = string.Empty;

    [JsonPropertyName("option")]
    public string Option { get; init; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("shortComment")]
    public string ShortComment { get; init; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; init; } = string.Empty;
}
