using System.Text.Json.Serialization;

namespace McpServer.Models;

public record SolutionMetadata
{
    [JsonPropertyName("productName")]
    public string? ProductName { get; init; }

    [JsonPropertyName("company")]
    public string? Company { get; init; }

    [JsonPropertyName("department")]
    public string? Department { get; init; }

    [JsonPropertyName("contactPerson")]
    public string? ContactPerson { get; init; }

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("executionType")]
    public string? ExecutionType { get; init; }

    [JsonPropertyName("architecturalRole")]
    public string? ArchitecturalRole { get; init; }
}
