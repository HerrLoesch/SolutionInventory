using System.Text.Json.Nodes;
using McpServer.Logic;
using McpServer.Models;
using Xunit;
using static McpServer.Tests.Build;

namespace McpServer.Tests;

public sealed class CleanedDataExporterTests : IDisposable
{
    private readonly string _root;
    private readonly CleanedDataExporter _exporter;

    public CleanedDataExporterTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "mcpserver-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        _exporter = new CleanedDataExporter(new FakeWebHostEnvironment(_root), new TechRadarStatusValidator());
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* best effort */ }
    }

    // A questionnaire that mixes a canonical answer with a dirty one that needs cleaning.
    private static (WorkspaceExport Ws, Questionnaire Q) DirtyWorkspace()
    {
        var q = Questionnaire("q1", "Service A",
            MetadataCategory(FullMetadata()),
            Category("infra-data", "Infra",
                Entry("infra-rdbms", "RDBMS", Answers(
                    Answer("PostgreSQL", "Adopt", "  primary  "),
                    Answer("postgresql", "adopt")))));
        return (Workspace(q), q);
    }

    [Fact]
    public void Json_export_writes_a_cleaned_file_and_reports_size()
    {
        var (ws, q) = DirtyWorkspace();

        var result = _exporter.Export(ws, q, "json");

        Assert.True(result.Success, result.Error);
        Assert.NotNull(result.FilePath);
        Assert.True(File.Exists(result.FilePath));
        Assert.EndsWith(".json", result.FilePath);
        Assert.StartsWith(_root, result.FilePath);
        Assert.True(result.SizeMb > 0);
    }

    [Fact]
    public void Json_export_unifies_technology_spelling_and_status_and_trims_comments()
    {
        var (ws, q) = DirtyWorkspace();

        var result = _exporter.Export(ws, q, "json");

        var root = JsonNode.Parse(File.ReadAllText(result.FilePath!))!;
        var answers = root["categories"]!.AsArray()
            .First(c => (string?)c!["id"] == "infra-data")!["entries"]!.AsArray()
            .First(e => (string?)e!["id"] == "infra-rdbms")!["answers"]!.AsArray();

        Assert.All(answers, a => Assert.Equal("PostgreSQL", (string?)a!["technology"]));
        Assert.All(answers, a => Assert.Equal("Adopt", (string?)a!["status"]));
        Assert.Equal("primary", (string?)answers[0]!["comments"]);
    }

    [Fact]
    public void Export_counts_only_changed_technology_and_status_values()
    {
        var (ws, q) = DirtyWorkspace();

        // 'postgresql' -> 'PostgreSQL' (1) and 'adopt' -> 'Adopt' (1); the canonical answer is untouched.
        var result = _exporter.Export(ws, q, "json");

        Assert.Equal(2, result.CorrectionsApplied);
    }

    [Fact]
    public void Csv_export_writes_header_and_cleaned_rows()
    {
        var (ws, q) = DirtyWorkspace();

        var result = _exporter.Export(ws, q, "csv");

        Assert.True(result.Success, result.Error);
        Assert.EndsWith(".csv", result.FilePath);

        var lines = File.ReadAllLines(result.FilePath!);
        Assert.StartsWith("questionnaire_id,questionnaire_name,category_id", lines[0]);
        Assert.Equal(3, lines.Length); // header + 2 answers
        Assert.Contains(lines, l => l.Contains(",PostgreSQL,Adopt,primary"));
        Assert.DoesNotContain(lines, l => l.Contains(",postgresql,"));
    }

    [Fact]
    public void Csv_export_skips_the_metadata_category()
    {
        var (ws, q) = DirtyWorkspace();

        var result = _exporter.Export(ws, q, "csv");
        var text = File.ReadAllText(result.FilePath!);

        Assert.DoesNotContain("solution-desc", text);
    }

    [Theory]
    [InlineData("xml")]
    [InlineData("yaml")]
    [InlineData("")]
    public void Unsupported_format_fails_without_writing_a_file(string format)
    {
        var (ws, q) = DirtyWorkspace();

        var result = _exporter.Export(ws, q, format);

        Assert.False(result.Success);
        Assert.Null(result.FilePath);
        Assert.NotNull(result.Error);
        Assert.False(Directory.Exists(Path.Combine(_root, "exports")) &&
                     Directory.EnumerateFiles(Path.Combine(_root, "exports")).Any());
    }

    [Fact]
    public void Csv_export_escapes_values_containing_commas_and_quotes()
    {
        var q = Questionnaire("q1", "Service A",
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(
                    Answer("Node.js", "Adopt", "fast, reliable and \"proven\"")))));

        var result = _exporter.Export(Workspace(q), q, "csv");
        var lines = File.ReadAllLines(result.FilePath!);

        // The comment field must be quoted and its inner quotes doubled.
        Assert.Contains(lines, l => l.Contains("\"fast, reliable and \"\"proven\"\"\""));
        Assert.Equal(2, lines.Length); // header + 1 answer, no row split on the embedded comma
    }
}
