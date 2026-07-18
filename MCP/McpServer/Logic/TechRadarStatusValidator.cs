using McpServer.Models;

namespace McpServer.Logic;

/// <summary>
/// Validates every status value in the workspace (tech-radar entries and
/// questionnaire answers) against the canonical status whitelist
/// (<see cref="SchemaVocabulary.CanonicalStatuses"/>). Non-canonical values are
/// flagged and, where a confident correction exists, a canonical replacement is
/// suggested. The same <see cref="Canonicalize"/> logic is reused by the cleaned
/// export to auto-correct deviations.
/// </summary>
public sealed class TechRadarStatusValidator
{
    private const int MaxCorrectionDistance = 2;

    /// <summary>Outcome of mapping a raw status onto the canonical whitelist.</summary>
    /// <param name="Canonical">The canonical value, or null when no confident match exists.</param>
    /// <param name="IsExactMatch">True when the raw value already equals a canonical value exactly.</param>
    public readonly record struct StatusMatch(string? Canonical, bool IsExactMatch);

    /// <summary>
    /// Maps a raw status onto the canonical whitelist:
    /// exact match → returned unchanged; case-only difference or a close typo
    /// (edit distance ≤ 2) → the canonical value is returned as a suggested
    /// correction; otherwise → no canonical value.
    /// </summary>
    public StatusMatch Canonicalize(string? rawStatus)
    {
        if (string.IsNullOrWhiteSpace(rawStatus)) return new StatusMatch(null, false);

        var canonicals = SchemaVocabulary.CanonicalStatuses;

        var exact = canonicals.FirstOrDefault(c => c.Equals(rawStatus, StringComparison.Ordinal));
        if (exact is not null) return new StatusMatch(exact, true);

        var caseInsensitive = canonicals.FirstOrDefault(c => c.Equals(rawStatus, StringComparison.OrdinalIgnoreCase));
        if (caseInsensitive is not null) return new StatusMatch(caseInsensitive, false);

        var closest = TextSimilarity.ClosestMatch(rawStatus, canonicals, MaxCorrectionDistance);
        return new StatusMatch(closest, false);
    }

    public StatusValidationReport Validate(WorkspaceExport workspace, IReadOnlyCollection<string>? excludedIds = null)
    {
        var violations = new List<StatusViolation>();
        int checkedCount = 0;

        void Check(string? rawStatus, string location)
        {
            if (string.IsNullOrWhiteSpace(rawStatus)) return; // empty = unanswered, not a terminology deviation
            checkedCount++;

            var match = Canonicalize(rawStatus);
            if (match.IsExactMatch) return;

            violations.Add(new StatusViolation(
                location,
                rawStatus.Trim(),
                match.Canonical,
                match.Canonical is not null));
        }

        // Tech-radar entries
        foreach (var radar in workspace.Project?.Radar ?? [])
            Check(radar.Status, $"radar entry '{radar.Option}'");

        // Questionnaire answers
        foreach (var q in workspace.Questionnaires)
        {
            if (IsExcluded(q, excludedIds)) continue;
            foreach (var cat in q.Categories)
            {
                if (cat.IsMetadata == true) continue;
                foreach (var entry in cat.Entries ?? [])
                    foreach (var answer in entry.Answers ?? [])
                        Check(answer.Status, $"{q.Name} › {entry.Aspect} › '{answer.Technology}'");
            }
        }

        return new StatusValidationReport(SchemaVocabulary.CanonicalStatuses, checkedCount, violations);
    }

    private static bool IsExcluded(Questionnaire q, IReadOnlyCollection<string>? excludedIds) =>
        excludedIds is not null && excludedIds.Any(id => id.Equals(q.Id, StringComparison.OrdinalIgnoreCase));
}
