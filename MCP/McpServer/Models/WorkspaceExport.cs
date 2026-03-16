using System.Text.Json.Serialization;

namespace McpServer.Models;

public record WorkspaceExport
{
    [JsonPropertyName("project")]
    public ProjectData? Project { get; init; }

    [JsonPropertyName("questionnaires")]
    public List<Questionnaire> Questionnaires { get; init; } = [];
}
