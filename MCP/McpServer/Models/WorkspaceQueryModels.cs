namespace McpServer.Models;

public record CategoryDefinition(
    string Id,
    string Title,
    IReadOnlyList<EntryDefinition> Entries
);

public record EntryDefinition(
    string Id,
    string Aspect
);

public record CategoryStructure(
    string Id,
    string Title,
    IReadOnlyList<EntryDefinition> Entries
);

public record QuestionnaireStructure(
    string Id,
    string Name,
    IReadOnlyList<CategoryStructure> Categories,
    bool IsReference = false
);

public record AnswerRecord(
    string QuestionnaireId,
    string QuestionnaireName,
    string CategoryId,
    string CategoryTitle,
    string EntryId,
    string Aspect,
    string? Technology,
    string? Status,
    string? Comment,
    string? Applicability,
    string? EntryComment
);

public record TechRadarData(
    IReadOnlyList<RadarEntry> Entries,
    IReadOnlyList<string> CategoryOrder
);

public record EvaluateResponsesResult(
    float ConsistencyScore,
    float CompletenessPercentage,
    IReadOnlyList<string> Warnings
);
