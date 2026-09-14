using System.Text.Json;
using System.Text.Json.Nodes;
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

    private readonly ILogger<ProjectRepository> _logger;
    private readonly SemaphoreSlim _sem = new(1, 1);

    private WorkspaceExport? _workspace;

    public ProjectRepository(ILogger<ProjectRepository> logger)
    {
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
            var json = await File.ReadAllTextAsync(fullPath);
            var ws = ParseWorkspaceExport(json);
            if (ws is null)
                return (false, "Deserialization returned null.");

            _workspace = ws;
            var msg = $"Workspace '{ws.Project?.Name}' loaded: {ws.Projects.Count} project(s), {ws.Questionnaires.Count} questionnaire(s).";
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
            var ws = ParseWorkspaceExport(json);
            if (ws is null)
                return (false, "Deserialization returned null.");

            _workspace = ws;
            var msg = $"Workspace '{ws.Project?.Name}' loaded: {ws.Projects.Count} project(s), {ws.Questionnaires.Count} questionnaire(s).";
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

    // ── Query ─────────────────────────────────────────────────────────────────

    /// <summary>All projects in the workspace, falling back to the single primary project when unset.</summary>
    private IReadOnlyList<ProjectData> AllProjects =>
        _workspace is null
            ? []
            : _workspace.Projects.Count > 0
                ? _workspace.Projects
                : _workspace.Project is not null ? [_workspace.Project] : [];

    /// <summary>
    /// Resolves a project id/name to the set of questionnaire IDs that belong to it.
    /// Returns <see langword="null"/> when <paramref name="projectId"/> is empty (no restriction),
    /// or an empty set when the project id does not match any known project.
    /// </summary>
    private HashSet<string>? ResolveProjectQuestionnaireIds(string? projectId)
    {
        if (string.IsNullOrWhiteSpace(projectId)) return null;

        var project = AllProjects.FirstOrDefault(p =>
            p.Id.Equals(projectId, StringComparison.OrdinalIgnoreCase) ||
            p.Name.Equals(projectId, StringComparison.OrdinalIgnoreCase));

        return project is null
            ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(project.QuestionnaireIds, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>Returns the projects available in the loaded workspace, for project selection.</summary>
    public IReadOnlyList<ProjectInfo>? GetProjects()
    {
        if (_workspace is null) return null;
        return AllProjects
            .Select(p => new ProjectInfo(p.Id, p.Name, p.QuestionnaireIds.AsReadOnly()))
            .ToList()
            .AsReadOnly();
    }

    private static IEnumerable<Questionnaire> FilterQuestionnaires(
        IEnumerable<Questionnaire> questionnaires,
        IReadOnlyCollection<string>? excludedIds,
        IReadOnlyCollection<string>? projectQuestionnaireIds = null)
    {
        if (excludedIds is not null && excludedIds.Count > 0)
            questionnaires = questionnaires.Where(q => !excludedIds.Any(id =>
                id.Equals(q.Id, StringComparison.OrdinalIgnoreCase)));

        if (projectQuestionnaireIds is not null)
            questionnaires = questionnaires.Where(q => projectQuestionnaireIds.Contains(q.Id));

        return questionnaires;
    }

    /// <summary>
    /// Returns all distinct categories (by id) that exist in the workspace (or a single project),
    /// including their entries (subcategories) with id and aspect label.
    /// </summary>
    public IReadOnlyList<CategoryDefinition>? GetCategories(
        IReadOnlyCollection<string>? excludedIds = null,
        string? projectId = null)
    {
        if (_workspace is null) return null;

        var projectQuestionnaireIds = ResolveProjectQuestionnaireIds(projectId);
        var seen = new Dictionary<string, CategoryDefinition>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in FilterQuestionnaires(_workspace.Questionnaires, excludedIds, projectQuestionnaireIds))
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
    public IReadOnlyList<QuestionnaireStructure>? GetQuestionnaireStructures(
        IReadOnlyCollection<string>? excludedIds = null,
        string? referenceId = null,
        string? projectId = null)
    {
        if (_workspace is null) return null;

        var projectQuestionnaireIds = ResolveProjectQuestionnaireIds(projectId);

        return FilterQuestionnaires(_workspace.Questionnaires, excludedIds, projectQuestionnaireIds).Select(q =>
        {
            var cats = q.Categories
                .Where(c => c.IsMetadata != true)
                .Select(c => new CategoryStructure(
                    c.Id,
                    c.Title,
                    (c.Entries ?? []).Select(e => new EntryDefinition(e.Id, e.Aspect)).ToList().AsReadOnly()))
                .ToList();

            var isReference = !string.IsNullOrEmpty(referenceId) &&
                referenceId.Equals(q.Id, StringComparison.OrdinalIgnoreCase);

            return new QuestionnaireStructure(q.Id, q.Name, cats.AsReadOnly(), isReference);
        }).ToList().AsReadOnly();
    }

    /// <summary>
    /// Returns every answer given for a specific category (and optional entry),
    /// optionally filtered to a single questionnaire.
    /// </summary>
    public IReadOnlyList<AnswerRecord>? GetAnswersForCategory(
        string categoryId,
        string? entryId                      = null,
        string? questionnaireId              = null,
        IReadOnlyCollection<string>? excludedIds = null,
        string? projectId                    = null)
    {
        if (_workspace is null) return null;

        var projectQuestionnaireIds = ResolveProjectQuestionnaireIds(projectId);
        var questionnaires = FilterQuestionnaires(_workspace.Questionnaires, excludedIds, projectQuestionnaireIds);
        if (!string.IsNullOrWhiteSpace(questionnaireId))
            questionnaires = questionnaires.Where(q =>
                q.Id.Equals(questionnaireId, StringComparison.OrdinalIgnoreCase) ||
                q.Name.Equals(questionnaireId, StringComparison.OrdinalIgnoreCase));

        var records = new List<AnswerRecord>();

        foreach (var q in questionnaires)
        {
            // Metadata categories store PII (company, department, etc.) – never expose via MCP.
            var category = q.Categories.FirstOrDefault(c =>
                c.IsMetadata != true &&
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

    /// <summary>Returns the tech radar, migrating from legacy format if needed.
    /// When <paramref name="projectId"/> is omitted, radars from all projects in the workspace
    /// are merged. Returns <see langword="null"/> when no workspace is loaded or the given
    /// project id/name does not match any project.
    /// Radar entries with no stored status are enriched from the matching questionnaire answer.
    /// </summary>
    public TechRadarData? GetTechRadar(string? projectId = null)
    {
        if (_workspace is null) return null;

        List<ProjectData> targetProjects;
        if (!string.IsNullOrWhiteSpace(projectId))
        {
            var match = AllProjects.FirstOrDefault(p =>
                p.Id.Equals(projectId, StringComparison.OrdinalIgnoreCase) ||
                p.Name.Equals(projectId, StringComparison.OrdinalIgnoreCase));
            if (match is null) return null;
            targetProjects = [match];
        }
        else
        {
            targetProjects = AllProjects.ToList();
        }

        if (targetProjects.Count == 0) return null;

        var entries       = new List<RadarEntry>();
        var categoryOrder = new List<string>();

        foreach (var p in targetProjects)
        {
            entries.AddRange(BuildRadarEntries(p));
            foreach (var c in p.RadarCategoryOrder)
                if (!categoryOrder.Contains(c, StringComparer.OrdinalIgnoreCase))
                    categoryOrder.Add(c);
        }

        // Enrich entries that have no stored status or category by looking up
        // the matching questionnaire answer – identical to the client's
        // effectiveStatus = radarStatus || questionnaireStatus logic.
        if (_workspace.Questionnaires.Count > 0 && entries.Any(e =>
                string.IsNullOrWhiteSpace(e.Status) || string.IsNullOrWhiteSpace(e.Category)))
        {
            var answerLookup = BuildAnswerLookup(_workspace.Questionnaires);
            entries = entries.Select(e =>
            {
                if (!string.IsNullOrWhiteSpace(e.Status) && !string.IsNullOrWhiteSpace(e.Category))
                    return e;

                var key = $"{e.EntryId}|{e.Option.Trim().ToLowerInvariant()}";
                if (!answerLookup.TryGetValue(key, out var found))
                    return e;

                return e with
                {
                    Status   = string.IsNullOrWhiteSpace(e.Status)   ? found.Status   : e.Status,
                    Category = string.IsNullOrWhiteSpace(e.Category) ? found.Category : e.Category
                };
            }).ToList();
        }

        return new TechRadarData(entries.AsReadOnly(), categoryOrder.AsReadOnly());
    }

    /// <summary>Builds the radar entries for a single project, migrating the legacy refs/overrides format if needed.</summary>
    private static List<RadarEntry> BuildRadarEntries(ProjectData p)
    {
        if (p.Radar.Count > 0)
        {
            // New unified format: use radar array directly
            return p.Radar.ToList();
        }

        // Legacy format: radarRefs defines the set; radarOverrides carries optional edits.
        // The client migration (migrateProjectRadar) starts from radarRefs and applies
        // overrides on top – we must do the same here so refs-without-overrides are included.
        return p.RadarRefs.Select(r =>
        {
            var norm      = r.Option.Trim().ToLowerInvariant();
            var override_ = p.RadarOverrides.FirstOrDefault(o =>
                o.EntryId.Equals(r.EntryId, StringComparison.OrdinalIgnoreCase) &&
                o.Option.Trim().ToLowerInvariant() == norm);

            return new RadarEntry
            {
                EntryId      = r.EntryId,
                Option       = r.Option.Trim(),
                Category     = string.IsNullOrWhiteSpace(override_?.CategoryOverride)
                                   ? string.Empty
                                   : override_!.CategoryOverride,
                Status       = override_?.Status       ?? string.Empty,
                ShortComment = override_?.ShortComment ?? string.Empty,
                Description  = override_?.Comment      ?? string.Empty
            };
        }).ToList();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Detects and normalises two workspace file formats:
    /// <list type="bullet">
    ///   <item>Standard project export: <c>{ project, questionnaires }</c></item>
    ///   <item>Full Electron autosave: <c>{ version, timestamp, workspace: { projects, questionnaires } }</c></item>
    /// </list>
    /// All projects and all questionnaires are kept so callers can scope queries to a single
    /// project, a single questionnaire, or the entire workspace.
    /// </summary>
    private static WorkspaceExport? ParseWorkspaceExport(string json)
    {
        // Quick attempt at the standard project-export format
        var standard = JsonSerializer.Deserialize<WorkspaceExport>(json, s_opts);
        if (standard?.Project is not null)
        {
            // Standard format is implicitly a single project; scope it to all its questionnaires.
            var project = standard.Project.QuestionnaireIds.Count > 0
                ? standard.Project
                : standard.Project with { QuestionnaireIds = standard.Questionnaires.Select(q => q.Id).ToList() };
            return standard with { Project = project, Projects = [project] };
        }

        // Try the full Electron client format:
        // { "version": 2, "workspace": { "projects": [...], "questionnaires": [...] } }
        try
        {
            var root          = JsonNode.Parse(json);
            var workspaceNode = root?["workspace"];
            if (workspaceNode is null) return standard;

            var projectsNode = workspaceNode["projects"]?.AsArray();
            if (projectsNode is null || projectsNode.Count == 0) return standard;

            // Keep every project and every questionnaire – scoping happens at query time.
            var allQuestionnaires = workspaceNode["questionnaires"]?.AsArray() ?? [];

            var normalised = new JsonObject
            {
                ["project"]        = projectsNode[0]!.DeepClone(),
                ["projects"]       = projectsNode.DeepClone(),
                ["questionnaires"] = allQuestionnaires.DeepClone()
            };

            return JsonSerializer.Deserialize<WorkspaceExport>(normalised.ToJsonString(), s_opts);
        }
        catch
        {
            return standard;
        }
    }

    /// <summary>
    /// Builds a lookup table from questionnaire answers:
    /// key = <c>"{entryId}|{optionLowercase}"</c>,
    /// value = (Status, CategoryTitle).
    /// Used to enrich radar entries whose stored status / category is empty.
    /// </summary>
    private static Dictionary<string, (string Status, string Category)> BuildAnswerLookup(
        IEnumerable<Questionnaire> questionnaires)
    {
        var lookup = new Dictionary<string, (string, string)>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in questionnaires)
        {
            foreach (var cat in q.Categories)
            {
                if (cat.IsMetadata == true) continue;
                foreach (var entry in cat.Entries ?? [])
                {
                    foreach (var answer in entry.Answers ?? [])
                    {
                        if (string.IsNullOrWhiteSpace(answer.Technology)) continue;
                        var key = $"{entry.Id}|{answer.Technology.Trim().ToLowerInvariant()}";
                        if (!lookup.ContainsKey(key))
                            lookup[key] = (answer.Status ?? string.Empty, cat.Title ?? string.Empty);
                    }
                }
            }
        }

        return lookup;
    }

    // ── Questionnaire lookup ──────────────────────────────────────────────────

    /// <summary>Finds a questionnaire by ID or name. Returns <see langword="null"/> when not found or no workspace is loaded.</summary>
    public Questionnaire? FindQuestionnaire(string questionnaireId)
    {
        if (_workspace is null) return null;
        return _workspace.Questionnaires.FirstOrDefault(q =>
            q.Id.Equals(questionnaireId, StringComparison.OrdinalIgnoreCase) ||
            q.Name.Equals(questionnaireId, StringComparison.OrdinalIgnoreCase));
    }

    // ── Summary helper (used by the UI API) ───────────────────────────────────

    public WorkspaceSummary? GetSummary(
        IReadOnlyCollection<string>? excludedIds = null,
        string? referenceId = null)
    {
        if (_workspace is null) return null;

        var allSummaries = _workspace.Questionnaires.Select(q =>
        {
            var metaCat    = q.Categories.FirstOrDefault(c => c.IsMetadata == true);
            var meta       = metaCat?.Metadata;
            var entryCount = q.Categories
                .Where(c => c.Entries is not null)
                .Sum(c => c.Entries!.Count);

            var isEnabled = excludedIds is null || !excludedIds.Any(id =>
                id.Equals(q.Id, StringComparison.OrdinalIgnoreCase));
            var isReference = !string.IsNullOrEmpty(referenceId) &&
                referenceId.Equals(q.Id, StringComparison.OrdinalIgnoreCase);

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
                entryCount,
                isEnabled,
                isReference
            );
        }).ToList();

        var enabledIds = new HashSet<string>(
            allSummaries.Where(q => q.IsEnabled).Select(q => q.Id),
            StringComparer.OrdinalIgnoreCase);

        var totalEntries = allSummaries.Where(q => q.IsEnabled).Sum(q => q.EntryCount);
        var totalAnswers = _workspace.Questionnaires
            .Where(q => enabledIds.Contains(q.Id))
            .SelectMany(q => q.Categories)
            .SelectMany(c => c.Entries ?? [])
            .Sum(e => e.Answers?.Count ?? 0);

        return new WorkspaceSummary(
            _workspace.Project?.Name ?? string.Empty,
            enabledIds.Count,
            allSummaries.AsReadOnly(),
            totalEntries,
            totalAnswers);
    }
}
