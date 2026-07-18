using System.Text;

namespace McpServer.Logic;

/// <summary>
/// Small text-normalisation and similarity helpers shared by the data-cleaning
/// features (naming-inconsistency detection, status validation, cleaned export).
/// </summary>
internal static class TextSimilarity
{
    /// <summary>
    /// Produces a comparison key for a raw value: trimmed, internal runs of
    /// whitespace collapsed to a single space, and lower-cased (invariant).
    /// Two raw values that differ only in casing or whitespace map to the same key.
    /// </summary>
    public static string NormalizeKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var sb = new StringBuilder(value.Length);
        bool pendingSpace = false;
        foreach (var ch in value.Trim())
        {
            if (char.IsWhiteSpace(ch))
            {
                pendingSpace = true;
                continue;
            }
            if (pendingSpace && sb.Length > 0) sb.Append(' ');
            pendingSpace = false;
            sb.Append(char.ToLowerInvariant(ch));
        }
        return sb.ToString();
    }

    /// <summary>Classic Levenshtein edit distance between two strings.</summary>
    public static int Levenshtein(string a, string b)
    {
        if (a == b) return 0;
        if (a.Length == 0) return b.Length;
        if (b.Length == 0) return a.Length;

        var prev = new int[b.Length + 1];
        var curr = new int[b.Length + 1];
        for (int j = 0; j <= b.Length; j++) prev[j] = j;

        for (int i = 1; i <= a.Length; i++)
        {
            curr[0] = i;
            for (int j = 1; j <= b.Length; j++)
            {
                int cost = a[i - 1] == b[j - 1] ? 0 : 1;
                curr[j] = Math.Min(
                    Math.Min(curr[j - 1] + 1, prev[j] + 1),
                    prev[j - 1] + cost);
            }
            (prev, curr) = (curr, prev);
        }
        return prev[b.Length];
    }

    /// <summary>
    /// Returns the candidate whose normalised form is closest (by edit distance) to
    /// <paramref name="value"/>, provided the distance does not exceed
    /// <paramref name="maxDistance"/>. Returns <see langword="null"/> when nothing is close enough.
    /// </summary>
    public static string? ClosestMatch(string value, IEnumerable<string> candidates, int maxDistance)
    {
        var key = NormalizeKey(value);
        string? best = null;
        int bestDistance = int.MaxValue;

        foreach (var candidate in candidates)
        {
            int distance = Levenshtein(key, NormalizeKey(candidate));
            if (distance < bestDistance)
            {
                bestDistance = distance;
                best = candidate;
                if (distance == 0) break;
            }
        }

        return bestDistance <= maxDistance ? best : null;
    }
}
