using McpServer.Logic;
using Xunit;

namespace McpServer.Tests;

public class TextSimilarityTests
{
    [Theory]
    [InlineData("  Tech   Radar ", "tech radar")]      // trim + collapse whitespace
    [InlineData("TechRadar", "techradar")]             // lower-case
    [InlineData("PostgreSQL", "postgresql")]
    [InlineData("A\tB\nC", "a b c")]                   // tabs/newlines collapse to single space
    [InlineData("", "")]
    [InlineData("   ", "")]
    [InlineData(null, "")]
    public void NormalizeKey_normalises_case_and_whitespace(string? input, string expected)
    {
        Assert.Equal(expected, TextSimilarity.NormalizeKey(input));
    }

    [Fact]
    public void NormalizeKey_makes_case_and_whitespace_variants_equal()
    {
        Assert.Equal(TextSimilarity.NormalizeKey("Tech Radar"), TextSimilarity.NormalizeKey("  tech   radar  "));
    }

    [Theory]
    [InlineData("kitten", "sitting", 3)]
    [InlineData("abc", "abc", 0)]
    [InlineData("", "abc", 3)]
    [InlineData("abc", "", 3)]
    [InlineData("Kubernets", "Kubernetes", 1)]         // single insertion
    [InlineData("flaw", "lawn", 2)]
    public void Levenshtein_computes_edit_distance(string a, string b, int expected)
    {
        Assert.Equal(expected, TextSimilarity.Levenshtein(a, b));
        Assert.Equal(expected, TextSimilarity.Levenshtein(b, a)); // symmetric
    }

    [Fact]
    public void ClosestMatch_returns_exact_normalised_match()
    {
        var candidates = new[] { "Adopt", "Trial", "Assess", "Hold", "Retire" };
        Assert.Equal("Adopt", TextSimilarity.ClosestMatch("adopt", candidates, 2));
    }

    [Fact]
    public void ClosestMatch_returns_near_match_within_distance()
    {
        var candidates = new[] { "Adopt", "Trial", "Assess", "Hold", "Retire" };
        Assert.Equal("Retire", TextSimilarity.ClosestMatch("Retired", candidates, 2));
    }

    [Fact]
    public void ClosestMatch_returns_null_when_nothing_close_enough()
    {
        var candidates = new[] { "Adopt", "Trial", "Assess", "Hold", "Retire" };
        Assert.Null(TextSimilarity.ClosestMatch("Bananas", candidates, 2));
    }
}
