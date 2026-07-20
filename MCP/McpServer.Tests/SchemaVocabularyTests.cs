using McpServer.Logic;
using Xunit;

namespace McpServer.Tests;

public class SchemaVocabularyTests
{
    [Fact]
    public void CanonicalStatuses_match_the_schema_whitelist_in_ring_order()
    {
        Assert.Equal(
            new[] { "Adopt", "Trial", "Assess", "Hold", "Retire" },
            SchemaVocabulary.CanonicalStatuses);
    }

    [Theory]
    [InlineData("frontend")]
    [InlineData("backend")]
    [InlineData("solution-desc")]
    [InlineData("qa-testing")]
    public void CategoryIds_contain_canonical_ids(string id)
    {
        Assert.Contains(id, SchemaVocabulary.CategoryIds);
    }

    [Fact]
    public void CategoryIds_are_case_sensitive()
    {
        Assert.Contains("frontend", SchemaVocabulary.CategoryIds);
        Assert.DoesNotContain("Frontend", SchemaVocabulary.CategoryIds);
    }

    [Theory]
    [InlineData("arch-hlp")]
    [InlineData("be-runtime")]
    [InlineData("fe-apptype")]
    [InlineData("sec-authn")]
    public void EntryIds_contain_canonical_ids(string id)
    {
        Assert.Contains(id, SchemaVocabulary.EntryIds);
    }

    [Fact]
    public void EntryIds_reject_unknown_identifiers()
    {
        Assert.DoesNotContain("ops-badentry", SchemaVocabulary.EntryIds);
        Assert.True(SchemaVocabulary.EntryIds.Count > 80, "expected the full entry-id vocabulary to be parsed");
    }
}
