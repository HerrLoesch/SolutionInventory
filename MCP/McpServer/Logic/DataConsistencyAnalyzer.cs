using McpServer.Models;

namespace McpServer.Logic;

/// <summary>
/// Scans a workspace for naming inconsistencies: case/whitespace variations of the
/// same value, near-duplicate terminology (likely typos or spelling variants), and
/// identifiers (category/entry IDs) that do not match the canonical vocabulary.
/// Every finding carries a suggested correction where one can be determined.
/// </summary>
public sealed class DataConsistencyAnalyzer
{
    // Near-duplicate heuristic. Single-character differences (the overwhelmingly
    // common typo) are flagged from 5 chars up; a 2-character distance is only
    // trusted for longer names, where a coincidental near-match is unlikely.
    private const int MinNearDuplicateLength = 5;
    private const int Distance2MinLength = 8;

    // Records a raw value together with how often, and where, it occurs.
    private sealed class NameStat(string field)
    {
        public string Field { get; } = field;
        public Dictionary<string, int> RawCounts { get; } = new(StringComparer.Ordinal);
        public int Total => RawCounts.Values.Sum();

        public void Add(string raw)
        {
            RawCounts.TryGetValue(raw, out var c);
            RawCounts[raw] = c + 1;
        }

        public string MostFrequentRaw =>
            RawCounts.OrderByDescending(kv => kv.Value)
                     .ThenBy(kv => kv.Key, StringComparer.Ordinal)
                     .First().Key;
    }

    public DataConsistencyReport Analyze(WorkspaceExport workspace, IReadOnlyCollection<string>? excludedIds = null)
    {
        var questionnaires = workspace.Questionnaires.Where(q => !IsExcluded(q, excludedIds)).ToList();

        // Group raw names by their normalised key so casing/whitespace/near-typo
        // variants of the same concept land together.
        var byKey = new Dictionary<string, NameStat>(StringComparer.Ordinal);

        void Record(string field, string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return;
            var key = TextSimilarity.NormalizeKey(raw);
            if (key.Length == 0) return;
            if (!byKey.TryGetValue(key, out var stat))
            {
                stat = new NameStat(field);
                byKey[key] = stat;
            }
            stat.Add(raw.Trim());
        }

        int identifiersScanned = 0;
        var findings = new List<ConsistencyFinding>();

        foreach (var q in questionnaires)
        {
            foreach (var cat in q.Categories)
            {
                if (cat.IsMetadata == true) continue;

                identifiersScanned++;
                if (!string.IsNullOrWhiteSpace(cat.Id) && !SchemaVocabulary.CategoryIds.Contains(cat.Id))
                    findings.Add(InvalidIdentifier("category-id", cat.Id, cat.Title, q.Name, SchemaVocabulary.CategoryIds));

                foreach (var entry in cat.Entries ?? [])
                {
                    identifiersScanned++;
                    if (!string.IsNullOrWhiteSpace(entry.Id) && !SchemaVocabulary.EntryIds.Contains(entry.Id))
                        findings.Add(InvalidIdentifier("entry-id", entry.Id, entry.Aspect, q.Name, SchemaVocabulary.EntryIds));

                    foreach (var answer in entry.Answers ?? [])
                        Record("technology", answer.Technology);
                }
            }
        }

        // Radar option names share the "technology" naming space – a radar option and
        // an answer that mean the same thing should be spelled identically.
        foreach (var radar in workspace.Project?.Radar ?? [])
            Record("radar-option", radar.Option);

        int namesScanned = byKey.Values.Sum(s => s.Total);

        findings.AddRange(FindCaseVariations(byKey));
        findings.AddRange(FindNearDuplicates(byKey));

        return new DataConsistencyReport(namesScanned, identifiersScanned, findings);
    }

    // ── Case / whitespace variations of the same normalised value ──────────────

    private static IEnumerable<ConsistencyFinding> FindCaseVariations(Dictionary<string, NameStat> byKey)
    {
        foreach (var stat in byKey.Values)
        {
            if (stat.RawCounts.Count <= 1) continue;

            var variants = stat.RawCounts
                .OrderByDescending(kv => kv.Value)
                .ThenBy(kv => kv.Key, StringComparer.Ordinal)
                .ToList();

            var suggestion = variants[0].Key;
            var detail = string.Join(", ", variants.Select(v => $"'{v.Key}' ×{v.Value}"));

            yield return new ConsistencyFinding(
                "case-variation",
                stat.Field,
                variants.Select(v => v.Key).ToList(),
                suggestion,
                $"Same value written {stat.RawCounts.Count} different ways ({detail}). Standardise on '{suggestion}'.");
        }
    }

    // ── Near-duplicate terminology (likely typos or spelling variants) ─────────

    private static IEnumerable<ConsistencyFinding> FindNearDuplicates(Dictionary<string, NameStat> byKey)
    {
        // One representative (most frequent raw) per normalised key.
        var reps = byKey
            .Where(kv => kv.Key.Length >= MinNearDuplicateLength)
            .Select(kv => (Key: kv.Key, Raw: kv.Value.MostFrequentRaw, Field: kv.Value.Field, Count: kv.Value.Total))
            .OrderBy(r => r.Key, StringComparer.Ordinal)
            .ToList();

        for (int i = 0; i < reps.Count; i++)
        {
            for (int j = i + 1; j < reps.Count; j++)
            {
                var a = reps[i];
                var b = reps[j];

                int distance = TextSimilarity.Levenshtein(a.Key, b.Key);
                int minLen   = Math.Min(a.Key.Length, b.Key.Length);
                bool isNearDuplicate =
                    (distance == 1) ||
                    (distance == 2 && minLen >= Distance2MinLength);
                if (!isNearDuplicate) continue;

                // The more frequent spelling is the suggested canonical form.
                var (keep, drop) = a.Count >= b.Count ? (a, b) : (b, a);
                var field = a.Field == b.Field ? a.Field : $"{a.Field}/{b.Field}";

                yield return new ConsistencyFinding(
                    "near-duplicate",
                    field,
                    new[] { keep.Raw, drop.Raw },
                    keep.Raw,
                    $"'{drop.Raw}' (×{drop.Count}) closely resembles '{keep.Raw}' (×{keep.Count}) — edit distance {distance}. Possible typo or spelling variant; consider merging into '{keep.Raw}'.");
            }
        }
    }

    // ── Identifier not in the canonical vocabulary ─────────────────────────────

    private static ConsistencyFinding InvalidIdentifier(
        string field, string rawId, string label, string questionnaireName, IReadOnlySet<string> canonical)
    {
        var suggestion = TextSimilarity.ClosestMatch(rawId, canonical, 3);
        var suffix = suggestion is not null
            ? $" Did you mean '{suggestion}'?"
            : " No close canonical match found.";

        return new ConsistencyFinding(
            $"invalid-{field}",
            field,
            new[] { rawId },
            suggestion,
            $"{field} '{rawId}' ('{label}') in questionnaire '{questionnaireName}' is not a canonical identifier.{suffix}");
    }

    private static bool IsExcluded(Questionnaire q, IReadOnlyCollection<string>? excludedIds) =>
        excludedIds is not null && excludedIds.Any(id => id.Equals(q.Id, StringComparison.OrdinalIgnoreCase));
}
