using McpServer.Models;
using McpServer.Logic;
using Xunit;
using static McpServer.Tests.Build;

namespace McpServer.Tests;

public class DataConsistencyAnalyzerTests
{
    private readonly DataConsistencyAnalyzer _analyzer = new();

    private static ConsistencyFinding? OfType(DataConsistencyReport report, string type) =>
        report.Findings.FirstOrDefault(f => f.Type == type);

    [Fact]
    public void Detects_case_and_whitespace_variation_and_suggests_dominant_spelling()
    {
        var ws = Workspace(Questionnaire("q1", "Q1",
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(
                    Answer("PostgreSQL", "Adopt"),
                    Answer("postgresql", "Adopt"))))));

        var report = _analyzer.Analyze(ws);

        var finding = OfType(report, "case-variation");
        Assert.NotNull(finding);
        Assert.Equal("technology", finding!.Field);
        Assert.Equal("PostgreSQL", finding.Suggestion);
        Assert.Contains("PostgreSQL", finding.Values);
        Assert.Contains("postgresql", finding.Values);
    }

    [Fact]
    public void Detects_single_character_near_duplicate()
    {
        var ws = Workspace(Questionnaire("q1", "Q1",
            Category("ops", "Ops",
                Entry("ops-orchestration", "Orchestration", Answers(Answer("Kubernetes", "Trial"))),
                Entry("ops-container-runtime", "Runtime", Answers(Answer("Kubernets", "Trial"))))));

        var finding = OfType(_analyzer.Analyze(ws), "near-duplicate");

        Assert.NotNull(finding);
        Assert.Equal("Kubernetes", finding!.Suggestion);
        Assert.Contains("Kubernets", finding.Values);
    }

    [Fact]
    public void Does_not_flag_short_distance_two_names_as_near_duplicates()
    {
        // 'Dapper' vs 'Dagger' are distance 2 but only 6 chars — coincidental, must not flag.
        var ws = Workspace(Questionnaire("q1", "Q1",
            Category("backend", "Backend",
                Entry("be-dal", "DAL", Answers(Answer("Dapper", "Adopt"))),
                Entry("be-ioc", "IoC", Answers(Answer("Dagger", "Adopt"))))));

        Assert.Null(OfType(_analyzer.Analyze(ws), "near-duplicate"));
    }

    [Fact]
    public void Flags_distance_two_only_for_longer_names()
    {
        // 'Kubernetes' vs 'Kubarnetos' are distance 2 and 10 chars — long enough to trust.
        var ws = Workspace(Questionnaire("q1", "Q1",
            Category("ops", "Ops",
                Entry("ops-orchestration", "Orchestration", Answers(Answer("Kubernetes", "Trial"))),
                Entry("ops-container-runtime", "Runtime", Answers(Answer("Kubarnetos", "Trial"))))));

        Assert.NotNull(OfType(_analyzer.Analyze(ws), "near-duplicate"));
    }

    [Fact]
    public void Flags_non_canonical_category_id_with_suggestion()
    {
        var ws = Workspace(Questionnaire("q1", "Q1",
            Category("Frontend", "Frontend",
                Entry("fe-apptype", "App Type", Answers(Answer("Angular", "Adopt"))))));

        var finding = OfType(_analyzer.Analyze(ws), "invalid-category-id");

        Assert.NotNull(finding);
        Assert.Contains("Frontend", finding!.Values);
        Assert.Equal("frontend", finding.Suggestion);
    }

    [Fact]
    public void Flags_non_canonical_entry_id()
    {
        var ws = Workspace(Questionnaire("q1", "Q1",
            Category("ops", "Ops",
                Entry("ops-badentry", "Bad Entry", Answers(Answer("Docker", "Adopt"))))));

        var finding = OfType(_analyzer.Analyze(ws), "invalid-entry-id");

        Assert.NotNull(finding);
        Assert.Contains("ops-badentry", finding!.Values);
    }

    [Fact]
    public void Radar_option_shares_the_technology_naming_space()
    {
        var project = Project("p", "P", Radar("infra-rdbms", "postgresql", "infra-data", "Adopt"));
        var ws = Workspace(project, Questionnaire("q1", "Q1",
            Category("infra-data", "Infra",
                Entry("infra-rdbms", "RDBMS", Answers(Answer("PostgreSQL", "Adopt"))))));

        var finding = OfType(_analyzer.Analyze(ws), "case-variation");

        Assert.NotNull(finding);
        Assert.Contains("PostgreSQL", finding!.Values);
        Assert.Contains("postgresql", finding.Values);
    }

    [Fact]
    public void Clean_workspace_produces_no_findings()
    {
        var ws = Workspace(Questionnaire("q1", "Q1",
            MetadataCategory(FullMetadata()),
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer(".NET", "Adopt")))),
            Category("frontend", "Frontend",
                Entry("fe-apptype", "App Type", Answers(Answer("Angular", "Trial"))))));

        var report = _analyzer.Analyze(ws);

        Assert.Empty(report.Findings);
        Assert.True(report.NamesScanned >= 2);
        Assert.True(report.IdentifiersScanned >= 2);
    }

    [Fact]
    public void Excluded_questionnaires_are_ignored()
    {
        var ws = Workspace(Questionnaire("hidden", "Hidden",
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(
                    Answer("PostgreSQL", "Adopt"),
                    Answer("postgresql", "Adopt"))))));

        var report = _analyzer.Analyze(ws, new[] { "hidden" });

        Assert.Empty(report.Findings);
    }

    [Fact]
    public void Metadata_category_is_not_scanned_as_an_identifier()
    {
        // 'solution-desc' is a metadata category and must not be treated as an entry/answer source.
        var ws = Workspace(Questionnaire("q1", "Q1", MetadataCategory(FullMetadata())));

        var report = _analyzer.Analyze(ws);

        Assert.Empty(report.Findings);
        Assert.Equal(0, report.IdentifiersScanned);
    }
}
