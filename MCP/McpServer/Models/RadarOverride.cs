using System.Text.Json.Serialization;

namespace McpServer.Models;

public record RadarOverride
{
    [JsonPropertyName("entryId")]
    public string EntryId { get; init; } = string.Empty;

    [JsonPropertyName("option")]
    public string Option { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("comment")]
    public string Comment { get; init; } = string.Empty;

    [JsonPropertyName("shortComment")]
    public string ShortComment { get; init; } = string.Empty;

    [JsonPropertyName("categoryOverride")]
    public string CategoryOverride { get; init; } = string.Empty;
}
