using System.Text.Json.Serialization;

namespace McpServer.Models;

public record QuestionnaireEntry
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("aspect")]
    public string Aspect { get; init; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("examples")]
    public List<EntryExample>? Examples { get; init; }

    [JsonPropertyName("answers")]
    public List<EntryAnswer>? Answers { get; init; }

    [JsonPropertyName("applicability")]
    public string? Applicability { get; init; }

    [JsonPropertyName("entryComment")]
    public string? EntryComment { get; init; }

    [JsonPropertyName("appliesTo")]
    public AppliesToFilter? AppliesTo { get; init; }
}
