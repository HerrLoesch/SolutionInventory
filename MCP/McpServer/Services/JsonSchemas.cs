namespace McpServer.Services;

/// <summary>
/// JSON Schema (Draft-07) definitions for SolutionInventory data formats.
/// Derived from categoriesService.js and the C# model classes.
/// </summary>
internal static class JsonSchemas
{
    /// <summary>Schema for the full workspace export file (project + questionnaires).</summary>
    public static string WorkspaceSchema => WorkspaceSchemaJson;

    /// <summary>Schema for a single questionnaire document.</summary>
    public static string QuestionnaireSchema => QuestionnaireSchemaJson;

    private const string WorkspaceSchemaJson = """
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "title": "SolutionInventory Workspace Export",
  "description": "Complete workspace export format. Contains one project with tech-radar data and a list of technology-assessment questionnaires.",
  "type": "object",
  "properties": {
    "project": {
      "$ref": "#/$defs/ProjectData"
    },
    "questionnaires": {
      "type": "array",
      "description": "Technology-assessment questionnaires belonging to this project.",
      "items": { "$ref": "#/$defs/Questionnaire" }
    }
  },
  "$defs": {
    "ProjectData": {
      "type": "object",
      "description": "Project definition including the tech-radar.",
      "required": ["id", "name"],
      "properties": {
        "id":   { "type": "string", "description": "Unique project identifier." },
        "name": { "type": "string", "description": "Project display name." },
        "radar": {
          "type": "array",
          "description": "Tech-radar entries for this project.",
          "items": { "$ref": "#/$defs/RadarEntry" }
        },
        "radarCategoryOrder": {
          "type": "array",
          "description": "Ordered list of category IDs controlling the radar display sequence.",
          "items": { "$ref": "#/$defs/CategoryId" }
        }
      }
    },
    "RadarEntry": {
      "type": "object",
      "description": "A positioned technology entry on the tech radar.",
      "required": ["entryId", "option", "category", "status"],
      "properties": {
        "entryId":      { "type": "string", "description": "Unique identifier for this radar entry." },
        "option":       { "type": "string", "description": "Technology or practice name (e.g. 'Vue.js', 'Docker', 'Clean Arch')." },
        "category":     { "$ref": "#/$defs/CategoryId", "description": "Radar category this entry belongs to." },
        "status":       { "$ref": "#/$defs/Status" },
        "shortComment": { "type": "string", "description": "Short rationale shown on the radar visualization." },
        "description":  { "type": "string", "description": "Full description and reasoning." }
      }
    },
    "Questionnaire": {
      "type": "object",
      "description": "A technology-assessment questionnaire (one per assessed solution or component).",
      "required": ["id", "name", "categories"],
      "properties": {
        "id":   { "type": "string", "description": "Unique questionnaire identifier." },
        "name": { "type": "string", "description": "Display name — usually the component or solution name." },
        "categories": {
          "type": "array",
          "description": "Ordered list of category responses.",
          "items": { "$ref": "#/$defs/QuestionnaireCategory" }
        }
      }
    },
    "QuestionnaireCategory": {
      "type": "object",
      "description": "Responses for a single questionnaire category.",
      "required": ["id", "title"],
      "properties": {
        "id":         { "$ref": "#/$defs/CategoryId" },
        "title":      { "type": "string" },
        "desc":       { "type": "string" },
        "isMetadata": { "type": "boolean", "description": "True for the 'solution-desc' metadata category." },
        "metadata": {
          "$ref": "#/$defs/SolutionMetadata",
          "description": "Filled only when isMetadata is true (solution-desc category)."
        },
        "entries": {
          "type": "array",
          "description": "Answered entries within this category.",
          "items": { "$ref": "#/$defs/QuestionnaireEntry" }
        }
      }
    },
    "SolutionMetadata": {
      "type": "object",
      "description": "Descriptive metadata for the assessed solution (solution-desc category).",
      "properties": {
        "productName":   { "type": "string" },
        "company":       { "type": "string" },
        "department":    { "type": "string" },
        "contactPerson": { "type": "string" },
        "description":   { "type": "string" },
        "executionType": {
          "type": "string",
          "description": "Execution model of the software. Controls which questionnaire entries are applicable.",
          "enum": [
            "Not specified",
            "Web Application",
            "Desktop Application",
            "Mobile Application",
            "Headless Service / API",
            "Background Worker / Daemon",
            "Embedded / IoT"
          ]
        },
        "architecturalRole": {
          "type": "string",
          "description": "Role within the system architecture. Controls which questionnaire entries are applicable.",
          "enum": [
            "Not specified",
            "Standalone System",
            "Domain Service / Microservice",
            "Integration Bridge / Middleware",
            "Add-on / Plugin",
            "AI / ML Inference Engine"
          ]
        }
      }
    },
    "QuestionnaireEntry": {
      "type": "object",
      "description": "A single answered entry within a questionnaire category.",
      "required": ["id", "aspect"],
      "properties": {
        "id": { "$ref": "#/$defs/EntryId" },
        "aspect":        { "type": "string", "description": "Human-readable aspect label (e.g. 'High-Level Pattern', 'Tech Stack & Runtime')." },
        "applicability": {
          "type": "string",
          "description": "Whether this entry applies to the assessed solution.",
          "enum": ["applicable", "not-applicable", "conditional"]
        },
        "entryComment": { "type": "string", "description": "Free-text comment about applicability or context." },
        "answers": {
          "type": "array",
          "description": "One or more technology or practice answers for this aspect.",
          "items": { "$ref": "#/$defs/EntryAnswer" }
        }
      }
    },
    "EntryAnswer": {
      "type": "object",
      "description": "A single technology or practice answer within an entry.",
      "required": ["technology", "status"],
      "properties": {
        "technology": { "type": "string", "description": "Technology, tool, or practice name (e.g. 'Vue.js', 'Entity Framework', 'Docker')." },
        "status":     { "$ref": "#/$defs/Status" },
        "comments":   { "type": "string", "description": "Optional rationale or additional context for this answer." }
      }
    },
    "Status": {
      "type": "string",
      "description": "Tech-radar ring position. Adopt = recommended standard; Trial = being tested in production; Assess = under evaluation; Hold = discouraged for new work; Retire = actively being removed.",
      "enum": ["Adopt", "Trial", "Assess", "Hold", "Retire"]
    },
    "CategoryId": {
      "type": "string",
      "description": "Top-level questionnaire/radar category identifier.",
      "enum": [
        "solution-desc",
        "architecture",
        "frontend",
        "backend",
        "infra-data",
        "ops",
        "security",
        "hardware-io",
        "qa-testing"
      ]
    },
    "EntryId": {
      "type": "string",
      "description": "Questionnaire entry identifier. Valid IDs per category — architecture: arch-hlp (High-Level Pattern), arch-protocols (Communication Protocols), arch-state (Application State Model), arch-data-pattern (Data Architecture Patterns), arch-ownership (Data Ownership), arch-tenancy (Multi-Tenancy Model), arch-datetime (Date & Time Representation), arch-res (Resilience Patterns), arch-failure (Failure Domains), arch-off (Offline Capability), arch-decompose (Service Decomposition), arch-integration (Integration Pattern), arch-consistency (Consistency Model), arch-extensibility (Extensibility Model), arch-feature (Feature Strategy), arch-dep (Dependency Management), arch-topology (Deployment Topology), arch-cloud (Cloud Strategy & Dependency), arch-ai (AI Integration Pattern) | frontend: fe-clientos (Client OS), fe-apptype (App Type & Stack), fe-state (State Management), fe-complib (Component Library), fe-styling (UI Styling / Theming), fe-cache (Client Caching Strategy), fe-error (Client Error Handling), fe-logging (Client Logging), fe-a11y (Accessibility), fe-i18n (Internationalization), fe-analytics (Client Analytics), fe-build (Frontend Build System), fe-quality (Code Quality & Formatting), fe-unittest (Frontend Unit Testing), fe-dev-env (Development Environment) | backend: be-runtime (Tech Stack & Runtime), fe-runtimeos (Runtime OS), be-api-doc (API Documentation), be-api-versioning (API Versioning), be-dal (Data Access Layer), be-ioc (IoC Container), be-cache (Server-Side Caching), be-jobs (Job Scheduling), be-workflow (Workflow Engine), be-error (Backend Error Handling), be-logging (Backend Logging Framework), be-unittest (Backend Unit Testing), be-integration (Backend Integration Testing), be-perf (Code-Level Profiling), be-dev-env (Development Environment) | infra-data: infra-rdbms (Relational Database), infra-schema (Schema Migration Management), infra-nosql (NoSQL Databases), infra-vectordb (Vector Database / Search), infra-middleware (Message Bus & Integration Middleware), infra-dataplatform (Data Platform & Warehousing), infra-analytics (Data Analytics & Visualization), infra-cloud-services (Managed Cloud Services) | ops: ops-deploy (Deployment Artifact), ops-update (Update Mechanism), ops-config (Configuration Management), ops-resources (Resource Constraints), ops-remote (Remote Support Access), ops-webserver (Webserver / Reverse Proxy), ops-virtualization (Hardware Virtualization), ops-container-runtime (Container Runtime), ops-orchestration (Container Orchestration), ops-registry (Artifact / Container Registry), ops-iac (Infrastructure as Code), ops-cicd (CI/CD Pipeline), ops-log-aggregation (Log Aggregation), ops-metrics (Metrics & Alerting), ops-tracing (Distributed Tracing), ops-dr (Disaster Recovery & SLAs), ops-backup (Backup Strategy), ops-retention (Data Retention & Archiving) | security: sec-authn (Authentication), sec-authz (Authorization), sec-secrets (Secret Management), sec-encryption (Encryption), sec-vuln-scan (Vulnerability Scanning), sec-audit (Audit & Compliance Logging), sec-licensing (Licensing & Usage Enforcement) | hardware-io: hw-communication (Communication Patterns), hw-driver (Driver Abstraction), hw-buffering (Data Buffering Strategy), hw-realtime (Real-Time Requirements), hw-lifecycle (Connection Lifecycle) | qa-testing: qa-testcase (Test Case Management), qa-traceability (Requirement Traceability), qa-code-quality (Code Quality & Coverage), qa-integration (Integration & API Testing), qa-e2e (End-to-End Testing), qa-performance (Performance & Load Testing), qa-testdata (Test Data Management)",
      "enum": [
        "arch-hlp", "arch-protocols", "arch-state", "arch-data-pattern", "arch-ownership",
        "arch-tenancy", "arch-datetime", "arch-res", "arch-failure", "arch-off",
        "arch-decompose", "arch-integration", "arch-consistency", "arch-extensibility",
        "arch-feature", "arch-dep", "arch-topology", "arch-cloud", "arch-ai",
        "fe-clientos", "fe-apptype", "fe-state", "fe-complib", "fe-styling",
        "fe-cache", "fe-error", "fe-logging", "fe-a11y", "fe-i18n",
        "fe-analytics", "fe-build", "fe-quality", "fe-unittest", "fe-dev-env",
        "be-runtime", "fe-runtimeos", "be-api-doc", "be-api-versioning", "be-dal",
        "be-ioc", "be-cache", "be-jobs", "be-workflow", "be-error",
        "be-logging", "be-unittest", "be-integration", "be-perf", "be-dev-env",
        "infra-rdbms", "infra-schema", "infra-nosql", "infra-vectordb", "infra-middleware",
        "infra-dataplatform", "infra-analytics", "infra-cloud-services",
        "ops-deploy", "ops-update", "ops-config", "ops-resources", "ops-remote",
        "ops-webserver", "ops-virtualization", "ops-container-runtime", "ops-orchestration",
        "ops-registry", "ops-iac", "ops-cicd", "ops-log-aggregation", "ops-metrics",
        "ops-tracing", "ops-dr", "ops-backup", "ops-retention",
        "sec-authn", "sec-authz", "sec-secrets", "sec-encryption", "sec-vuln-scan",
        "sec-audit", "sec-licensing",
        "hw-communication", "hw-driver", "hw-buffering", "hw-realtime", "hw-lifecycle",
        "qa-testcase", "qa-traceability", "qa-code-quality", "qa-integration",
        "qa-e2e", "qa-performance", "qa-testdata"
      ]
    }
  }
}
""";

    private const string QuestionnaireSchemaJson = """
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "title": "SolutionInventory Questionnaire",
  "description": "A single technology-assessment questionnaire document.",
  "type": "object",
  "required": ["id", "name", "categories"],
  "properties": {
    "id":   { "type": "string", "description": "Unique questionnaire identifier." },
    "name": { "type": "string", "description": "Display name — usually the component or solution name." },
    "categories": {
      "type": "array",
      "description": "Ordered list of category responses. Starts with 'solution-desc' (metadata), followed by applicable technology categories.",
      "items": { "$ref": "#/$defs/QuestionnaireCategory" }
    }
  },
  "$defs": {
    "QuestionnaireCategory": {
      "type": "object",
      "required": ["id", "title"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Category identifier.",
          "enum": [
            "solution-desc", "architecture", "frontend", "backend",
            "infra-data", "ops", "security", "hardware-io", "qa-testing"
          ]
        },
        "title":      { "type": "string" },
        "desc":       { "type": "string" },
        "isMetadata": {
          "type": "boolean",
          "description": "True for the 'solution-desc' category. When true, use 'metadata' instead of 'entries'."
        },
        "metadata":   { "$ref": "#/$defs/SolutionMetadata" },
        "entries": {
          "type": "array",
          "items": { "$ref": "#/$defs/QuestionnaireEntry" }
        }
      }
    },
    "SolutionMetadata": {
      "type": "object",
      "description": "Solution description metadata for the 'solution-desc' category.",
      "properties": {
        "productName":   { "type": "string" },
        "company":       { "type": "string" },
        "department":    { "type": "string" },
        "contactPerson": { "type": "string" },
        "description":   { "type": "string" },
        "executionType": {
          "type": "string",
          "description": "Execution model — controls which questionnaire entries are shown.",
          "enum": [
            "Not specified", "Web Application", "Desktop Application",
            "Mobile Application", "Headless Service / API",
            "Background Worker / Daemon", "Embedded / IoT"
          ]
        },
        "architecturalRole": {
          "type": "string",
          "description": "Architectural role — controls which questionnaire entries are shown.",
          "enum": [
            "Not specified", "Standalone System", "Domain Service / Microservice",
            "Integration Bridge / Middleware", "Add-on / Plugin", "AI / ML Inference Engine"
          ]
        }
      }
    },
    "QuestionnaireEntry": {
      "type": "object",
      "required": ["id", "aspect"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Entry identifier. See workspace schema $defs/EntryId for the full list of valid IDs per category.",
          "examples": ["arch-hlp", "be-runtime", "fe-apptype", "ops-deploy", "sec-authn"]
        },
        "aspect":       { "type": "string", "description": "Human-readable aspect label." },
        "applicability": {
          "type": "string",
          "enum": ["applicable", "not-applicable", "conditional"]
        },
        "entryComment": { "type": "string" },
        "answers": {
          "type": "array",
          "description": "One or more technology or practice answers.",
          "minItems": 1,
          "items": { "$ref": "#/$defs/EntryAnswer" }
        }
      }
    },
    "EntryAnswer": {
      "type": "object",
      "required": ["technology", "status"],
      "properties": {
        "technology": { "type": "string", "description": "Technology, tool, or practice name." },
        "status": {
          "type": "string",
          "description": "Tech-radar position for this technology.",
          "enum": ["Adopt", "Trial", "Assess", "Hold", "Retire"]
        },
        "comments": { "type": "string" }
      }
    }
  }
}
""";
}
