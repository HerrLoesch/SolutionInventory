using System.Text.Json.Serialization;

namespace McpServer.Models;

public record EntryAnswer
{
    [JsonPropertyName("technology")]
    public string Technology { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("comments")]
    public string? Comments { get; init; }

    [JsonPropertyName("answerType")]
    public string? AnswerType { get; init; }

    [JsonPropertyName("isRadarRef")]
    public bool? IsRadarRef { get; init; }
}
