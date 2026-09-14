using System.Text.Json.Serialization;

namespace McpServer.Models;

public record WorkspaceExport
{
    /// <summary>Primary project, kept for backward compatibility with single-project exports.</summary>
    [JsonPropertyName("project")]
    public ProjectData? Project { get; init; }

    /// <summary>All projects contained in the workspace (multi-project support).</summary>
    [JsonPropertyName("projects")]
    public List<ProjectData> Projects { get; init; } = [];

    /// <summary>All questionnaires across all projects in the workspace.</summary>
    [JsonPropertyName("questionnaires")]
    public List<Questionnaire> Questionnaires { get; init; } = [];
}
