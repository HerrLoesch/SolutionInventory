using System.Text.Json;
using McpServer.Models;

namespace McpServer.Data;

/// <summary>
/// Singleton data store for the loaded Solution Inventory workspace.
/// Provides load, query, and search operations against the in-memory workspace export.
/// </summary>
public sealed class ProjectRepository
{
    private static readonly JsonSerializerOptions s_opts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // Candidate paths searched when loading the built-in example (relative to content root).
    private static readonly string[] ExampleRelativePaths =
    [
        "Data/example_export.json",
        "../../Client/tests/data/example_export.json",
        "../../../Client/tests/data/example_export.json",
    ];

    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ProjectRepository> _logger;
    private readonly SemaphoreSlim _sem = new(1, 1);

    private WorkspaceExport? _workspace;

    public ProjectRepository(IWebHostEnvironment env, ILogger<ProjectRepository> logger)
    {
        _env    = env;
        _logger = logger;
    }

    // ── State ─────────────────────────────────────────────────────────────────

    public bool IsLoaded => _workspace is not null;

    public WorkspaceExport? Current => _workspace;

    // ── Load ─────────────────────────────────────────────────────────────────

    /// <summary>Loads the workspace from an absolute file path.</summary>
    public async Task<(bool Success, string Message)> LoadFromFileAsync(string path)
    {
        var fullPath = Path.GetFullPath(path);
        if (!File.Exists(fullPath))
            return (false, $"File not found: {fullPath}");

        await _sem.WaitAsync();
        try
        {
            await using var stream = File.OpenRead(fullPath);
            var ws = await JsonSerializer.DeserializeAsync<WorkspaceExport>(stream, s_opts);
            if (ws is null)
                return (false, "Deserialization returned null.");

            _workspace = ws;
            var msg = $"Workspace '{ws.Project?.Name}' loaded: {ws.Questionnaires.Count} questionnaire(s).";
            _logger.LogInformation("{Message} (source: {Path})", msg, fullPath);
            return (true, msg);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load workspace from {Path}", fullPath);
            return (false, $"Error reading file: {ex.Message}");
        }
        finally
        {
            _sem.Release();
        }
    }

    /// <summary>Parses and loads a workspace directly from a JSON string (e.g. uploaded via the browser).</summary>
    public async Task<(bool Success, string Message)> LoadFromJsonAsync(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return (false, "Empty content.");

        await _sem.WaitAsync();
        try
        {
            var ws = JsonSerializer.Deserialize<WorkspaceExport>(json, s_opts);
            if (ws is null)
                return (false, "Deserialization returned null.");

            _workspace = ws;
            var msg = $"Workspace '{ws.Project?.Name}' loaded: {ws.Questionnaires.Count} questionnaire(s).";
            _logger.LogInformation("{Message} (uploaded via browser)", msg);
            return (true, msg);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse uploaded workspace JSON");
            return (false, $"Invalid JSON: {ex.Message}");
        }
        finally
        {
            _sem.Release();
        }
    }

    /// <summary>Attempts to load the built-in example workspace from well-known locations.</summary>
    public async Task<(bool Success, string Message)> LoadExampleAsync()
    {
        foreach (var rel in ExampleRelativePaths)
        {
            var full = Path.GetFullPath(Path.Combine(_env.ContentRootPath, rel));
            if (File.Exists(full))
                return await LoadFromFileAsync(full);
        }

        var tried = string.Join(", ", ExampleRelativePaths);
        _logger.LogWarning("Built-in example workspace not found. Tried: {Paths}", tried);
        return (false, $"Example file not found. Tried: {tried}");
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns all distinct categories (by id) that exist in the workspace,
    /// including their entries (subcategories) with id and aspect label.
    /// </summary>
    public IReadOnlyList<CategoryDefinition>? GetCategories()
    {
        if (_workspace is null) return null;

        // Collect the first occurrence of each category id across all questionnaires
        // so the caller gets a complete, deduplicated catalog.
        var seen = new Dictionary<string, CategoryDefinition>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in _workspace.Questionnaires)
        {
            foreach (var cat in q.Categories)
            {
                if (cat.IsMetadata == true) continue;
                if (seen.ContainsKey(cat.Id)) continue;

                var entries = (cat.Entries ?? [])
                    .Select(e => new EntryDefinition(e.Id, e.Aspect))
                    .ToList();

                seen[cat.Id] = new CategoryDefinition(cat.Id, cat.Title, entries.AsReadOnly());
            }
        }

        return seen.Values.ToList().AsReadOnly();
    }

    /// <summary>
    /// Returns the structural outline of every questionnaire – id, name and the
    /// non-metadata categories with their entry ids/aspects. No answers or metadata.
    /// </summary>
    public IReadOnlyList<QuestionnaireStructure>? GetQuestionnaireStructures()
    {
        if (_workspace is null) return null;

        return _workspace.Questionnaires.Select(q =>
        {
            var cats = q.Categories
                .Where(c => c.IsMetadata != true)
                .Select(c => new CategoryStructure(
                    c.Id,
                    c.Title,
                    (c.Entries ?? []).Select(e => new EntryDefinition(e.Id, e.Aspect)).ToList().AsReadOnly()))
                .ToList();

            return new QuestionnaireStructure(q.Id, q.Name, cats.AsReadOnly());
        }).ToList().AsReadOnly();
    }

    /// <summary>
    /// Returns every answer given for a specific category (and optional entry),
    /// optionally filtered to a single questionnaire.
    /// </summary>
    public IReadOnlyList<AnswerRecord>? GetAnswersForCategory(
        string categoryId,
        string? entryId         = null,
        string? questionnaireId = null)
    {
        if (_workspace is null) return null;

        var questionnaires = string.IsNullOrWhiteSpace(questionnaireId)
            ? _workspace.Questionnaires
            : _workspace.Questionnaires.Where(q =>
                q.Id.Equals(questionnaireId, StringComparison.OrdinalIgnoreCase) ||
                q.Name.Equals(questionnaireId, StringComparison.OrdinalIgnoreCase)).ToList();

        var records = new List<AnswerRecord>();

        foreach (var q in questionnaires)
        {
            var category = q.Categories.FirstOrDefault(c =>
                c.Id.Equals(categoryId, StringComparison.OrdinalIgnoreCase));

            if (category is null) continue;

            var entries = (category.Entries ?? [])
                .Where(e => string.IsNullOrWhiteSpace(entryId) ||
                            e.Id.Equals(entryId, StringComparison.OrdinalIgnoreCase));

            foreach (var entry in entries)
            {
                foreach (var answer in entry.Answers ?? [])
                {
                    records.Add(new AnswerRecord(
                        q.Id,
                        q.Name,
                        category.Id,
                        category.Title,
                        entry.Id,
                        entry.Aspect,
                        answer.Technology,
                        answer.Status,
                        answer.Comments,
                        entry.Applicability,
                        entry.EntryComment));
                }

                // If the entry has no answers but a comment/applicability, record that too
                if ((entry.Answers is null || entry.Answers.Count == 0) &&
                    (!string.IsNullOrWhiteSpace(entry.EntryComment) || !string.IsNullOrWhiteSpace(entry.Applicability)))
                {
                    records.Add(new AnswerRecord(
                        q.Id,
                        q.Name,
                        category.Id,
                        category.Title,
                        entry.Id,
                        entry.Aspect,
                        null,
                        null,
                        null,
                        entry.Applicability,
                        entry.EntryComment));
                }
            }
        }

        return records.AsReadOnly();
    }

    /// <summary>Returns the tech radar (overrides + category order) from the loaded project.</summary>
    public TechRadarData? GetTechRadar()
    {
        if (_workspace?.Project is null) return null;
        var p = _workspace.Project;
        return new TechRadarData(
            p.RadarOverrides.AsReadOnly(),
            p.RadarRefs.AsReadOnly(),
            p.RadarCategoryOrder.AsReadOnly());
    }

    // ── Summary helper (used by the UI API) ───────────────────────────────────

    public WorkspaceSummary? GetSummary()
    {
        if (_workspace is null) return null;

        var questSummaries = _workspace.Questionnaires.Select(q =>
        {
            var metaCat    = q.Categories.FirstOrDefault(c => c.IsMetadata == true);
            var meta       = metaCat?.Metadata;
            var entryCount = q.Categories
                .Where(c => c.Entries is not null)
                .Sum(c => c.Entries!.Count);

            return new QuestionnaireSummary(
                q.Id,
                q.Name,
                meta?.ProductName,
                meta?.Company,
                meta?.Department,
                meta?.ContactPerson,
                meta?.ExecutionType,
                meta?.ArchitecturalRole,
                q.Categories.Count,
                entryCount
            );
        }).ToList();

        var totalEntries = questSummaries.Sum(q => q.EntryCount);
        var totalAnswers = _workspace.Questionnaires
            .SelectMany(q => q.Categories)
            .SelectMany(c => c.Entries ?? [])
            .Sum(e => e.Answers?.Count ?? 0);

        return new WorkspaceSummary(
            _workspace.Project?.Name ?? string.Empty,
            _workspace.Questionnaires.Count,
            questSummaries.AsReadOnly(),
            totalEntries,
            totalAnswers);
    }
}
