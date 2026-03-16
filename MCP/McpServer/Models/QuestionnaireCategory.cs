using System.Text.Json.Serialization;

namespace McpServer.Models;

public record QuestionnaireCategory
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("desc")]
    public string Desc { get; init; } = string.Empty;

    [JsonPropertyName("isMetadata")]
    public bool? IsMetadata { get; init; }

    [JsonPropertyName("metadata")]
    public SolutionMetadata? Metadata { get; init; }

    [JsonPropertyName("metadataOptions")]
    public MetadataOptions? MetadataOptions { get; init; }

    [JsonPropertyName("entries")]
    public List<QuestionnaireEntry>? Entries { get; init; }

    [JsonPropertyName("appliesTo")]
    public AppliesToFilter? AppliesTo { get; init; }
}
