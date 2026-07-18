using System.Text;
using System.Text.Json;
using McpServer.Models;

namespace McpServer.Logic;

/// <summary>
/// Exports a single questionnaire to disk in cleaned form. Cleaning applies the
/// data-quality rules from the rest of this feature: technology names are unified
/// to the most frequent spelling used across the workspace, status values are
/// corrected to the canonical whitelist, and surrounding whitespace is trimmed.
/// Supports JSON (full questionnaire document) and CSV (flat answer rows).
/// </summary>
public sealed class CleanedDataExporter
{
    private static readonly JsonSerializerOptions s_json = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private readonly TechRadarStatusValidator _statusValidator;
    private readonly string _outputDir;

    public CleanedDataExporter(IWebHostEnvironment env, TechRadarStatusValidator statusValidator)
    {
        _statusValidator = statusValidator;
        _outputDir = Path.Combine(env.ContentRootPath, "exports");
    }

    /// <summary>The supported output formats.</summary>
    public static readonly IReadOnlyList<string> SupportedFormats = ["json", "csv"];

    public ExportResult Export(WorkspaceExport workspace, Questionnaire questionnaire, string outputFormat)
    {
        var format = outputFormat?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!SupportedFormats.Contains(format))
            return new ExportResult(false, null, 0, 0, $"Unsupported output_format '{outputFormat}'. Use 'json' or 'csv'.");

        var techMap = BuildTechnologyCanonicalMap(workspace);

        var (cleaned, corrections) = CleanQuestionnaire(questionnaire, techMap);

        try
        {
            Directory.CreateDirectory(_outputDir);
            var stamp    = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
            var safeId   = SanitizeForFileName(questionnaire.Id);
            var fileName = $"{safeId}_cleaned_{stamp}.{format}";
            var fullPath = Path.Combine(_outputDir, fileName);

            var content = format == "csv" ? BuildCsv(cleaned) : JsonSerializer.Serialize(cleaned, s_json);
            File.WriteAllText(fullPath, content, new UTF8Encoding(false));

            var sizeMb = Math.Round(new FileInfo(fullPath).Length / (1024.0 * 1024.0), 6);
            return new ExportResult(true, fullPath, sizeMb, corrections, null);
        }
        catch (Exception ex)
        {
            return new ExportResult(false, null, 0, corrections, $"Failed to write export: {ex.Message}");
        }
    }

    // ── Cleaning ───────────────────────────────────────────────────────────────

    private (Questionnaire Cleaned, int Corrections) CleanQuestionnaire(
        Questionnaire questionnaire, IReadOnlyDictionary<string, string> techMap)
    {
        var cleanedCategories = new List<QuestionnaireCategory>(questionnaire.Categories.Count);
        int corrections = 0;

        foreach (var cat in questionnaire.Categories)
        {
            if (cat.IsMetadata == true || cat.Entries is null)
            {
                cleanedCategories.Add(cat);
                continue;
            }

            var cleanedEntries = new List<QuestionnaireEntry>(cat.Entries.Count);
            foreach (var entry in cat.Entries)
            {
                List<EntryAnswer>? cleanedAnswers = null;
                if (entry.Answers is not null)
                {
                    cleanedAnswers = new List<EntryAnswer>(entry.Answers.Count);
                    foreach (var answer in entry.Answers)
                    {
                        var (cleanedAnswer, delta) = CleanAnswer(answer, techMap);
                        corrections += delta;
                        cleanedAnswers.Add(cleanedAnswer);
                    }
                }

                cleanedEntries.Add(entry with
                {
                    Answers      = cleanedAnswers,
                    EntryComment = TrimOrNull(entry.EntryComment)
                });
            }

            cleanedCategories.Add(cat with { Entries = cleanedEntries });
        }

        return (questionnaire with { Categories = cleanedCategories }, corrections);
    }

    private (EntryAnswer Answer, int Corrections) CleanAnswer(
        EntryAnswer answer, IReadOnlyDictionary<string, string> techMap)
    {
        var techKey = TextSimilarity.NormalizeKey(answer.Technology);
        var technology = techMap.TryGetValue(techKey, out var canonicalTech)
            ? canonicalTech
            : answer.Technology?.Trim() ?? string.Empty;

        var statusMatch = _statusValidator.Canonicalize(answer.Status);
        var status = statusMatch.Canonical ?? answer.Status?.Trim() ?? string.Empty;

        int corrections = 0;
        if (!string.Equals(technology, answer.Technology, StringComparison.Ordinal)) corrections++;
        if (!string.Equals(status, answer.Status, StringComparison.Ordinal)) corrections++;

        return (answer with
        {
            Technology = technology,
            Status     = status,
            Comments   = TrimOrNull(answer.Comments)
        }, corrections);
    }

    /// <summary>
    /// Maps each normalised technology name to its most frequent raw spelling
    /// across the whole workspace, so all variants collapse onto one canonical form.
    /// </summary>
    private static Dictionary<string, string> BuildTechnologyCanonicalMap(WorkspaceExport workspace)
    {
        var counts = new Dictionary<string, Dictionary<string, int>>(StringComparer.Ordinal);

        void Add(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return;
            var key = TextSimilarity.NormalizeKey(raw);
            if (key.Length == 0) return;
            if (!counts.TryGetValue(key, out var forms))
            {
                forms = new Dictionary<string, int>(StringComparer.Ordinal);
                counts[key] = forms;
            }
            var trimmed = raw.Trim();
            forms.TryGetValue(trimmed, out var c);
            forms[trimmed] = c + 1;
        }

        foreach (var q in workspace.Questionnaires)
            foreach (var cat in q.Categories)
                foreach (var entry in cat.Entries ?? [])
                    foreach (var answer in entry.Answers ?? [])
                        Add(answer.Technology);

        foreach (var radar in workspace.Project?.Radar ?? [])
            Add(radar.Option);

        return counts.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.OrderByDescending(f => f.Value)
                          .ThenBy(f => f.Key, StringComparer.Ordinal)
                          .First().Key,
            StringComparer.Ordinal);
    }

    // ── CSV rendering ──────────────────────────────────────────────────────────

    private static string BuildCsv(Questionnaire questionnaire)
    {
        var sb = new StringBuilder();
        sb.AppendLine("questionnaire_id,questionnaire_name,category_id,category_title,entry_id,aspect,applicability,entry_comment,technology,status,comments");

        foreach (var cat in questionnaire.Categories)
        {
            if (cat.IsMetadata == true) continue;
            foreach (var entry in cat.Entries ?? [])
            {
                var answers = entry.Answers is { Count: > 0 }
                    ? entry.Answers
                    : new List<EntryAnswer> { new() };

                foreach (var answer in answers)
                {
                    sb.AppendLine(string.Join(",", new[]
                    {
                        Csv(questionnaire.Id),
                        Csv(questionnaire.Name),
                        Csv(cat.Id),
                        Csv(cat.Title),
                        Csv(entry.Id),
                        Csv(entry.Aspect),
                        Csv(entry.Applicability),
                        Csv(entry.EntryComment),
                        Csv(answer.Technology),
                        Csv(answer.Status),
                        Csv(answer.Comments)
                    }));
                }
            }
        }

        return sb.ToString();
    }

    private static string Csv(string? value)
    {
        value ??= string.Empty;
        if (value.IndexOfAny(['"', ',', '\n', '\r']) < 0) return value;
        return $"\"{value.Replace("\"", "\"\"")}\"";
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string SanitizeForFileName(string value)
    {
        var chars = value.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c).ToArray();
        var sanitized = new string(chars).Trim();
        return string.IsNullOrEmpty(sanitized) ? "questionnaire" : sanitized;
    }
}
