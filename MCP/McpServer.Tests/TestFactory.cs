using McpServer.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

namespace McpServer.Tests;

/// <summary>Concise builders for the immutable model records used across the tests.</summary>
internal static class Build
{
    public static EntryAnswer Answer(string technology, string status, string? comments = null) =>
        new() { Technology = technology, Status = status, Comments = comments };

    public static List<EntryAnswer> Answers(params EntryAnswer[] answers) => answers.ToList();

    public static QuestionnaireEntry Entry(
        string id,
        string aspect,
        List<EntryAnswer>? answers = null,
        string? applicability = null,
        string? entryComment = null) =>
        new()
        {
            Id            = id,
            Aspect        = aspect,
            Answers       = answers,
            Applicability = applicability,
            EntryComment  = entryComment
        };

    public static QuestionnaireCategory Category(string id, string title, params QuestionnaireEntry[] entries) =>
        new() { Id = id, Title = title, Entries = entries.ToList() };

    public static QuestionnaireCategory MetadataCategory(SolutionMetadata? metadata = null) =>
        new()
        {
            Id         = "solution-desc",
            Title      = "Solution Description",
            IsMetadata = true,
            Metadata   = metadata
        };

    public static SolutionMetadata FullMetadata() =>
        new()
        {
            ProductName       = "Product",
            Company           = "Company",
            Department        = "Dept",
            ContactPerson     = "Person",
            ExecutionType     = "Web Application",
            ArchitecturalRole = "Standalone System"
        };

    public static Questionnaire Questionnaire(string id, string name, params QuestionnaireCategory[] categories) =>
        new() { Id = id, Name = name, Categories = categories.ToList() };

    public static RadarEntry Radar(string entryId, string option, string category, string status) =>
        new() { EntryId = entryId, Option = option, Category = category, Status = status };

    public static ProjectData Project(string id = "p1", string name = "Project", params RadarEntry[] radar) =>
        new() { Id = id, Name = name, Radar = radar.ToList() };

    public static WorkspaceExport Workspace(ProjectData? project, params Questionnaire[] questionnaires) =>
        new() { Project = project, Questionnaires = questionnaires.ToList() };

    public static WorkspaceExport Workspace(params Questionnaire[] questionnaires) =>
        Workspace(Project(), questionnaires);
}

/// <summary>
/// Minimal <see cref="IWebHostEnvironment"/> used to point <c>CleanedDataExporter</c>
/// at a throwaway content root during tests.
/// </summary>
internal sealed class FakeWebHostEnvironment(string contentRootPath) : IWebHostEnvironment
{
    public string ContentRootPath { get; set; } = contentRootPath;
    public string EnvironmentName { get; set; } = "Test";
    public string ApplicationName { get; set; } = "McpServer.Tests";
    public string WebRootPath { get; set; } = string.Empty;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
}
