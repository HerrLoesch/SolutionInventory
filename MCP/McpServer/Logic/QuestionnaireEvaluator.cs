using McpServer.Models;

namespace McpServer.Logic;

/// <summary>
/// Evaluates the response quality of a single questionnaire.
/// Contains all evaluation logic that was previously embedded in <see cref="McpServer.Data.ProjectRepository"/>.
/// </summary>
public sealed class QuestionnaireEvaluator
{
    /// <summary>
    /// Evaluates consistency and completeness of the given questionnaire.
    /// Returns a consistency score (0–1), a completeness percentage (0–100),
    /// and a list of human-readable warnings describing detected issues.
    /// </summary>
    public EvaluateResponsesResult Evaluate(Questionnaire questionnaire)
    {
        var warnings = new List<string>();

        // ── Completeness ──────────────────────────────────────────────────────

        var metaCat = questionnaire.Categories.FirstOrDefault(c => c.IsMetadata == true);
        var meta    = metaCat?.Metadata;

        // Mandatory metadata fields
        var mandatoryFields = new Dictionary<string, string?>
        {
            ["productName"]       = meta?.ProductName,
            ["company"]           = meta?.Company,
            ["department"]        = meta?.Department,
            ["contactPerson"]     = meta?.ContactPerson,
            ["executionType"]     = meta?.ExecutionType,
            ["architecturalRole"] = meta?.ArchitecturalRole,
        };

        int filledMetadata = 0;
        foreach (var (field, value) in mandatoryFields)
        {
            if (string.IsNullOrWhiteSpace(value))
                warnings.Add($"Missing mandatory metadata field: '{field}'.");
            else
                filledMetadata++;
        }

        // Non-metadata entries
        var nonMetaCategories = questionnaire.Categories
            .Where(c => c.IsMetadata != true)
            .ToList();

        var allEntries = nonMetaCategories
            .SelectMany(c => c.Entries ?? [])
            .ToList();

        int entriesWithAnswers = 0;
        foreach (var cat in nonMetaCategories)
        {
            foreach (var entry in cat.Entries ?? [])
            {
                if (entry.Answers is { Count: > 0 })
                    entriesWithAnswers++;
                else
                    warnings.Add(
                        $"Entry '{entry.Aspect}' ('{entry.Id}') in category '{cat.Title}' has no answers.");
            }
        }

        int totalCompletable = mandatoryFields.Count + allEntries.Count;
        float completeness   = totalCompletable > 0
            ? (float)(filledMetadata + entriesWithAnswers) / totalCompletable * 100f
            : 100f;

        // ── Consistency ───────────────────────────────────────────────────────

        // Collect all statuses per technology name across the questionnaire.
        var techStatusMap = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var cat in nonMetaCategories)
        {
            foreach (var entry in cat.Entries ?? [])
            {
                if (entry.Answers is null) continue;

                // Within-entry: flag duplicate technology entries.
                var duplicates = entry.Answers
                    .GroupBy(a => a.Technology, StringComparer.OrdinalIgnoreCase)
                    .Where(g => g.Count() > 1);

                foreach (var group in duplicates)
                {
                    var statuses = group
                        .Select(a => a.Status)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                    warnings.Add(statuses.Count > 1
                        ? $"Technology '{group.Key}' in entry '{entry.Aspect}' has conflicting statuses: {string.Join(", ", statuses)}."
                        : $"Technology '{group.Key}' is listed {group.Count()} times in entry '{entry.Aspect}'.");
                }

                // Collect statuses for cross-entry consistency check.
                foreach (var answer in entry.Answers)
                {
                    if (!techStatusMap.TryGetValue(answer.Technology, out var set))
                    {
                        set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        techStatusMap[answer.Technology] = set;
                    }
                    if (!string.IsNullOrWhiteSpace(answer.Status))
                        set.Add(answer.Status);
                }

                // Flag Hold / Retire answers without an explanatory comment.
                foreach (var answer in entry.Answers)
                {
                    bool isCritical =
                        answer.Status?.Equals("Hold",   StringComparison.OrdinalIgnoreCase) == true ||
                        answer.Status?.Equals("Retire", StringComparison.OrdinalIgnoreCase) == true;

                    if (isCritical && string.IsNullOrWhiteSpace(answer.Comments))
                        warnings.Add(
                            $"Technology '{answer.Technology}' has status '{answer.Status}' in entry '{entry.Aspect}' without an explanatory comment.");
                }
            }
        }

        // Cross-entry consistency: same technology, different statuses.
        int consistent = 0, inconsistent = 0;
        foreach (var (tech, statuses) in techStatusMap)
        {
            if (statuses.Count > 1)
            {
                inconsistent++;
                warnings.Add(
                    $"Technology '{tech}' appears with inconsistent statuses across the questionnaire: {string.Join(", ", statuses)}.");
            }
            else
            {
                consistent++;
            }
        }

        int total = consistent + inconsistent;
        float consistencyScore = total > 0 ? (float)consistent / total : 1f;

        return new EvaluateResponsesResult(
            (float)Math.Round(consistencyScore, 2, MidpointRounding.AwayFromZero),
            (float)Math.Round(completeness,     2, MidpointRounding.AwayFromZero),
            warnings.AsReadOnly());
    }
}
