using System.Text.Json.Nodes;
using McpServer.Services;

namespace McpServer.Logic;

/// <summary>
/// Single source of truth for the canonical SolutionInventory vocabulary
/// (status rings, category IDs, entry IDs). The values are parsed once, lazily,
/// from the workspace JSON schema in <see cref="JsonSchemas"/> so they can never
/// drift from the schema that <c>get_json_schema</c> hands to clients.
/// </summary>
internal static class SchemaVocabulary
{
    // Fallback used only if the schema ever fails to parse – keeps validation working.
    private static readonly string[] s_statusFallback = ["Adopt", "Trial", "Assess", "Hold", "Retire"];

    private static readonly Lazy<Vocabulary> s_data = new(Parse);

    /// <summary>Canonical tech-radar status rings, in ring order.</summary>
    public static IReadOnlyList<string> CanonicalStatuses => s_data.Value.Statuses;

    /// <summary>Canonical top-level category identifiers.</summary>
    public static IReadOnlySet<string> CategoryIds => s_data.Value.CategoryIds;

    /// <summary>Canonical questionnaire entry identifiers.</summary>
    public static IReadOnlySet<string> EntryIds => s_data.Value.EntryIds;

    private sealed record Vocabulary(
        IReadOnlyList<string> Statuses,
        IReadOnlySet<string> CategoryIds,
        IReadOnlySet<string> EntryIds);

    private static Vocabulary Parse()
    {
        try
        {
            var root = JsonNode.Parse(JsonSchemas.WorkspaceSchema);
            var defs = root?["$defs"];

            var statuses   = ReadEnum(defs?["Status"]);
            var categories = ReadEnum(defs?["CategoryId"]);
            var entries    = ReadEnum(defs?["EntryId"]);

            return new Vocabulary(
                statuses.Count   > 0 ? statuses : s_statusFallback,
                new HashSet<string>(categories, StringComparer.Ordinal),
                new HashSet<string>(entries,    StringComparer.Ordinal));
        }
        catch
        {
            return new Vocabulary(
                s_statusFallback,
                new HashSet<string>(StringComparer.Ordinal),
                new HashSet<string>(StringComparer.Ordinal));
        }
    }

    private static List<string> ReadEnum(JsonNode? node)
    {
        var values = new List<string>();
        if (node?["enum"] is JsonArray arr)
        {
            foreach (var item in arr)
            {
                var v = item?.GetValue<string>();
                if (!string.IsNullOrEmpty(v)) values.Add(v);
            }
        }
        return values;
    }
}
