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

        var totalEntries  = questSummaries.Sum(q => q.EntryCount);
        var totalAnswers  = _workspace.Questionnaires
            .SelectMany(q => q.Categories)
            .SelectMany(c => c.Entries ?? [])
            .Sum(e => e.Answers?.Count ?? 0);

        return new WorkspaceSummary(
            _workspace.Project?.Name ?? string.Empty,
            _workspace.Questionnaires.Count,
            questSummaries.AsReadOnly(),
            totalEntries,
            totalAnswers
        );
    }

    public Questionnaire? GetQuestionnaire(string idOrName) =>
        _workspace?.Questionnaires.FirstOrDefault(q =>
            q.Id.Equals(idOrName, StringComparison.OrdinalIgnoreCase) ||
            q.Name.Equals(idOrName, StringComparison.OrdinalIgnoreCase));

    // ── Search ────────────────────────────────────────────────────────────────

    public WorkspaceSearchResponse Search(string query)
    {
        if (_workspace is null || string.IsNullOrWhiteSpace(query))
            return new WorkspaceSearchResponse(query, 0, []);

        var results = new List<WorkspaceSearchResult>();

        foreach (var questionnaire in _workspace.Questionnaires)
        {
            if (Matches(questionnaire.Name, query))
            {
                results.Add(new WorkspaceSearchResult(
                    questionnaire.Id, questionnaire.Name,
                    string.Empty, string.Empty,
                    null, null,
                    "questionnaire", questionnaire.Name,
                    null));
            }

            foreach (var category in questionnaire.Categories)
            {
                if (Matches(category.Title, query) || Matches(category.Desc, query))
                {
                    results.Add(new WorkspaceSearchResult(
                        questionnaire.Id, questionnaire.Name,
                        category.Id, category.Title,
                        null, null,
                        "category", category.Title,
                        null));
                }

                // Search solution metadata fields
                if (category.IsMetadata == true && category.Metadata is { } meta)
                {
                    var fields = new[] { meta.ProductName, meta.Company, meta.Department, meta.ContactPerson, meta.Description };
                    var hit    = fields.FirstOrDefault(f => Matches(f, query));
                    if (hit is not null)
                    {
                        results.Add(new WorkspaceSearchResult(
                            questionnaire.Id, questionnaire.Name,
                            category.Id, category.Title,
                            null, null,
                            "metadata", hit,
                            null));
                    }
                }

                foreach (var entry in category.Entries ?? [])
                {
                    if (Matches(entry.Aspect, query) || Matches(entry.Description, query) || Matches(entry.EntryComment, query))
                    {
                        results.Add(new WorkspaceSearchResult(
                            questionnaire.Id, questionnaire.Name,
                            category.Id, category.Title,
                            entry.Id, entry.Aspect,
                            "entry", entry.Aspect,
                            entry.Applicability));
                    }

                    foreach (var answer in entry.Answers ?? [])
                    {
                        if (Matches(answer.Technology, query) || Matches(answer.Comments, query))
                        {
                            results.Add(new WorkspaceSearchResult(
                                questionnaire.Id, questionnaire.Name,
                                category.Id, category.Title,
                                entry.Id, entry.Aspect,
                                "answer", $"{answer.Technology} ({answer.Status})",
                                entry.Applicability));
                        }
                    }

                    foreach (var example in entry.Examples ?? [])
                    {
                        if (Matches(example.Label, query) || example.Tools.Any(t => Matches(t, query)))
                        {
                            var matchText = Matches(example.Label, query)
                                ? example.Label
                                : example.Tools.First(t => Matches(t, query));

                            results.Add(new WorkspaceSearchResult(
                                questionnaire.Id, questionnaire.Name,
                                category.Id, category.Title,
                                entry.Id, entry.Aspect,
                                "example", matchText,
                                entry.Applicability));
                        }
                    }
                }
            }
        }

        return new WorkspaceSearchResponse(query, results.Count, results.AsReadOnly());
    }

    private static bool Matches(string? text, string query) =>
        !string.IsNullOrEmpty(text) &&
        text.Contains(query, StringComparison.OrdinalIgnoreCase);
}
