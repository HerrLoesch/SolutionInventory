namespace McpServer.Models;

public record WorkspaceSearchResponse(
    string Query,
    int TotalCount,
    IReadOnlyList<WorkspaceSearchResult> Results
);

public record WorkspaceSearchResult(
    string QuestionnaireId,
    string QuestionnaireName,
    string CategoryId,
    string CategoryTitle,
    string? EntryId,
    string? Aspect,
    string MatchType,
    string MatchText,
    string? Applicability
);
