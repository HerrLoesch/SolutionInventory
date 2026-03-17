namespace McpServer.Models;

public record WorkspaceSummary(
    string ProjectName,
    int QuestionnaireCount,
    IReadOnlyList<QuestionnaireSummary> Questionnaires,
    int TotalEntries,
    int TotalAnswers
);

public record QuestionnaireSummary(
    string Id,
    string Name,
    string? ProductName,
    string? Company,
    string? Department,
    string? ContactPerson,
    string? ExecutionType,
    string? ArchitecturalRole,
    int CategoryCount,
    int EntryCount,
    bool IsEnabled   = true,
    bool IsReference = false
);
