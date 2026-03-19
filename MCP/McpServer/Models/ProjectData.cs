using System.Text.Json.Serialization;

namespace McpServer.Models;

public record ProjectData
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("radar")]
    public List<RadarEntry> Radar { get; init; } = [];

    // Legacy fields kept for backward-compatible reading of old workspace exports
    [JsonPropertyName("radarRefs")]
    public List<RadarRef> RadarRefs { get; init; } = [];

    [JsonPropertyName("radarOverrides")]
    public List<RadarOverride> RadarOverrides { get; init; } = [];

    [JsonPropertyName("radarCategoryOrder")]
    public List<string> RadarCategoryOrder { get; init; } = [];
}
