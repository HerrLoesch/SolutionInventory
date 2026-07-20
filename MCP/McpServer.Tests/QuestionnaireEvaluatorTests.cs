using McpServer.Logic;
using McpServer.Models;
using Xunit;
using static McpServer.Tests.Build;

namespace McpServer.Tests;

public class QuestionnaireEvaluatorTests
{
    private readonly QuestionnaireEvaluator _evaluator = new();

    [Fact]
    public void Complete_and_consistent_questionnaire_scores_perfectly()
    {
        var q = Questionnaire("q1", "Q1",
            MetadataCategory(FullMetadata()),
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer(".NET", "Adopt")))),
            Category("frontend", "Frontend",
                Entry("fe-apptype", "App Type", Answers(Answer("Angular", "Trial")))));

        var result = _evaluator.Evaluate(q);

        Assert.Equal(1f, result.ConsistencyScore);
        Assert.Equal(100f, result.CompletenessPercentage);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void Missing_metadata_field_lowers_completeness_and_warns()
    {
        var metadata = FullMetadata() with { ProductName = null };
        var q = Questionnaire("q1", "Q1",
            MetadataCategory(metadata),
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer(".NET", "Adopt")))));

        var result = _evaluator.Evaluate(q);

        Assert.Contains(result.Warnings, w => w.Contains("productName"));
        Assert.InRange(result.CompletenessPercentage, 85.7f, 85.72f); // (5 meta + 1 entry) / 7
    }

    [Fact]
    public void Entry_without_answers_is_flagged()
    {
        var q = Questionnaire("q1", "Q1",
            MetadataCategory(FullMetadata()),
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer(".NET", "Adopt"))),
                Entry("be-cache", "Caching", answers: null)));

        var result = _evaluator.Evaluate(q);

        Assert.Contains(result.Warnings, w => w.Contains("has no answers") && w.Contains("be-cache"));
    }

    [Fact]
    public void Conflicting_statuses_within_an_entry_are_flagged_and_reduce_consistency()
    {
        var q = Questionnaire("q1", "Q1",
            MetadataCategory(FullMetadata()),
            Category("infra-data", "Infra",
                Entry("infra-nosql", "NoSQL", Answers(
                    Answer("Redis", "Adopt"),
                    Answer("Redis", "Hold", "legacy")))),
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer(".NET", "Adopt")))));

        var result = _evaluator.Evaluate(q);

        Assert.Contains(result.Warnings, w => w.Contains("conflicting statuses"));
        Assert.Equal(0.5f, result.ConsistencyScore); // Redis inconsistent, .NET consistent
    }

    [Fact]
    public void Duplicate_technology_with_same_status_is_flagged_as_a_repeat()
    {
        var q = Questionnaire("q1", "Q1",
            MetadataCategory(FullMetadata()),
            Category("infra-data", "Infra",
                Entry("infra-nosql", "NoSQL", Answers(
                    Answer("Redis", "Adopt"),
                    Answer("redis", "Adopt")))));

        var result = _evaluator.Evaluate(q);

        Assert.Contains(result.Warnings, w => w.Contains("listed 2 times"));
        Assert.Equal(1f, result.ConsistencyScore); // same status → still consistent
    }

    [Fact]
    public void Critical_status_without_comment_is_flagged()
    {
        var q = Questionnaire("q1", "Q1",
            MetadataCategory(FullMetadata()),
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer("LegacyStack", "Retire")))));

        var result = _evaluator.Evaluate(q);

        Assert.Contains(result.Warnings, w =>
            w.Contains("LegacyStack") && w.Contains("without an explanatory comment"));
    }

    [Fact]
    public void Critical_status_with_comment_is_not_flagged()
    {
        var q = Questionnaire("q1", "Q1",
            MetadataCategory(FullMetadata()),
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer("LegacyStack", "Hold", "being phased out")))));

        var result = _evaluator.Evaluate(q);

        Assert.DoesNotContain(result.Warnings, w => w.Contains("without an explanatory comment"));
    }

    [Fact]
    public void Same_technology_inconsistent_across_entries_is_flagged()
    {
        var q = Questionnaire("q1", "Q1",
            MetadataCategory(FullMetadata()),
            Category("backend", "Backend",
                Entry("be-runtime", "Runtime", Answers(Answer("Node.js", "Adopt"))),
                Entry("be-jobs", "Jobs", Answers(Answer("Node.js", "Hold", "legacy jobs")))));

        var result = _evaluator.Evaluate(q);

        Assert.Contains(result.Warnings, w =>
            w.Contains("Node.js") && w.Contains("inconsistent statuses across the questionnaire"));
        Assert.Equal(0f, result.ConsistencyScore);
    }
}
