using McpServer.Logic;
using Xunit;
using static McpServer.Tests.Build;

namespace McpServer.Tests;

public class TechRadarStatusValidatorTests
{
    private readonly TechRadarStatusValidator _validator = new();

    [Fact]
    public void Canonicalize_returns_exact_match_unchanged()
    {
        var match = _validator.Canonicalize("Adopt");
        Assert.True(match.IsExactMatch);
        Assert.Equal("Adopt", match.Canonical);
    }

    [Theory]
    [InlineData("adopt", "Adopt")]
    [InlineData("HOLD", "Hold")]
    [InlineData("retire", "Retire")]
    public void Canonicalize_fixes_casing_without_marking_exact(string raw, string expected)
    {
        var match = _validator.Canonicalize(raw);
        Assert.False(match.IsExactMatch);
        Assert.Equal(expected, match.Canonical);
    }

    [Theory]
    [InlineData("Retired", "Retire")]   // distance 1
    [InlineData("Asses", "Assess")]     // distance 1
    public void Canonicalize_maps_close_typos_to_canonical(string raw, string expected)
    {
        var match = _validator.Canonicalize(raw);
        Assert.False(match.IsExactMatch);
        Assert.Equal(expected, match.Canonical);
    }

    [Theory]
    [InlineData("Bananas")]
    [InlineData("")]
    [InlineData(null)]
    public void Canonicalize_returns_null_for_unrecognisable_values(string? raw)
    {
        var match = _validator.Canonicalize(raw);
        Assert.False(match.IsExactMatch);
        Assert.Null(match.Canonical);
    }

    [Fact]
    public void Validate_flags_radar_and_answer_deviations_but_not_exact_values()
    {
        var project = Project("p", "P", Radar("infra-rdbms", "PostgreSQL", "infra-data", "adopt"));
        var ws = Workspace(project, Questionnaire("q1", "Service A",
            Category("infra-data", "Infra",
                Entry("infra-rdbms", "RDBMS", Answers(
                    Answer("PostgreSQL", "Adopt"),   // exact — no violation
                    Answer("Redis", "Retired"))))));  // typo — violation

        var report = _validator.Validate(ws);

        Assert.Equal(new[] { "Adopt", "Trial", "Assess", "Hold", "Retire" }, report.CanonicalStatuses);
        Assert.Equal(3, report.StatusesChecked);
        Assert.Equal(2, report.Violations.Count);

        var radarViolation = report.Violations.Single(v => v.RawStatus == "adopt");
        Assert.Equal("Adopt", radarViolation.SuggestedStatus);
        Assert.True(radarViolation.AutoCorrectable);

        var answerViolation = report.Violations.Single(v => v.RawStatus == "Retired");
        Assert.Equal("Retire", answerViolation.SuggestedStatus);
        Assert.Contains("Redis", answerViolation.Location);
    }

    [Fact]
    public void Validate_skips_empty_status_values()
    {
        var ws = Workspace(Questionnaire("q1", "Q1",
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer("Node.js", ""))))));

        var report = _validator.Validate(ws);

        Assert.Equal(0, report.StatusesChecked);
        Assert.Empty(report.Violations);
    }

    [Fact]
    public void Validate_reports_unrecognisable_status_without_a_suggestion()
    {
        var ws = Workspace(Questionnaire("q1", "Q1",
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer("Node.js", "Bananas"))))));

        var violation = Assert.Single(_validator.Validate(ws).Violations);
        Assert.Equal("Bananas", violation.RawStatus);
        Assert.Null(violation.SuggestedStatus);
        Assert.False(violation.AutoCorrectable);
    }

    [Fact]
    public void Validate_ignores_excluded_questionnaires_but_still_checks_radar()
    {
        var project = Project("p", "P", Radar("infra-rdbms", "PostgreSQL", "infra-data", "adopt"));
        var ws = Workspace(project, Questionnaire("hidden", "Hidden",
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer("Node.js", "retire"))))));

        var report = _validator.Validate(ws, new[] { "hidden" });

        var violation = Assert.Single(report.Violations);
        Assert.Equal("adopt", violation.RawStatus); // only the radar entry, questionnaire excluded
    }
}
