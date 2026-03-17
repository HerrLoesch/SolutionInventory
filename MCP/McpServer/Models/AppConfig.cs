using System.Text.Json.Serialization;

namespace McpServer.Models;

/// <summary>
/// Persisted server configuration – mirrors the shape expected by the management UI.
/// </summary>
public record AppConfig
{
    [JsonPropertyName("access_enabled")]
    public bool AccessEnabled { get; init; } = true;

    [JsonPropertyName("data_source")]
    public string DataSource { get; init; } = "local";

    [JsonPropertyName("data_source_url")]
    public string DataSourceUrl { get; init; } = string.Empty;

    /// <summary>
    /// Questionnaire IDs that are hidden from all MCP tool responses.
    /// </summary>
    [JsonPropertyName("excluded_questionnaire_ids")]
    public IReadOnlyList<string> ExcludedQuestionnaireIds { get; init; } = [];

    /// <summary>
    /// The questionnaire ID that acts as the official reference / standard catalog.
    /// </summary>
    [JsonPropertyName("reference_questionnaire_id")]
    public string? ReferenceQuestionnaireId { get; init; }
}
