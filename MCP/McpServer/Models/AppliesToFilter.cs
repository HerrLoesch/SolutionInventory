using System.Text.Json.Serialization;

namespace McpServer.Models;

public record AppliesToFilter
{
    [JsonPropertyName("executionType")]
    public List<string>? ExecutionType { get; init; }

    [JsonPropertyName("architecturalRole")]
    public List<string>? ArchitecturalRole { get; init; }
}
