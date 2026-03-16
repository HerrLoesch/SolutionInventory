using System.Text.Json.Serialization;

namespace McpServer.Models;

public record MetadataOptions
{
    [JsonPropertyName("executionType")]
    public List<MetadataOption> ExecutionType { get; init; } = [];

    [JsonPropertyName("architecturalRole")]
    public List<MetadataOption> ArchitecturalRole { get; init; } = [];
}
