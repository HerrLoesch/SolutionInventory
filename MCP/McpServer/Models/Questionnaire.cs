using System.Text.Json.Serialization;

namespace McpServer.Models;

public record Questionnaire
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("categories")]
    public List<QuestionnaireCategory> Categories { get; init; } = [];
}
