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

/// <summary>A single naming inconsistency detected across the workspace.</summary>
public record ConsistencyFinding(
    string Type,                   // case-variation | near-duplicate | invalid-category-id | invalid-entry-id
    string Field,                  // technology | radar-option | category-id | entry-id
    IReadOnlyList<string> Values,  // the raw variant(s) involved
    string? Suggestion,            // suggested canonical value, or null when unknown
    string Detail                  // human-readable explanation with occurrence counts
);

/// <summary>Result of scanning the workspace for naming inconsistencies.</summary>
public record DataConsistencyReport(
    int NamesScanned,
    int IdentifiersScanned,
    IReadOnlyList<ConsistencyFinding> Findings
);

/// <summary>A single status value that deviates from the canonical whitelist.</summary>
public record StatusViolation(
    string Location,          // where the offending status was found
    string RawStatus,         // the non-canonical value
    string? SuggestedStatus,  // closest canonical value, or null when no confident match
    bool AutoCorrectable      // true when a confident canonical correction exists
);

/// <summary>Result of validating all status values against the canonical whitelist.</summary>
public record StatusValidationReport(
    IReadOnlyList<string> CanonicalStatuses,
    int StatusesChecked,
    IReadOnlyList<StatusViolation> Violations
);

/// <summary>Result of exporting a cleaned questionnaire to disk.</summary>
public record ExportResult(
    bool Success,
    string? FilePath,
    double SizeMb,
    int CorrectionsApplied,
    string? Error
);
