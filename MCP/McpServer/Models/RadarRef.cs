using System.Text.Json.Serialization;

namespace McpServer.Models;

public record RadarRef
{
    [JsonPropertyName("entryId")]
    public string EntryId { get; init; } = string.Empty;

    [JsonPropertyName("option")]
    public string Option { get; init; } = string.Empty;

    [JsonPropertyName("questionnaireId")]
    public string QuestionnaireId { get; init; } = string.Empty;
}
