---
applyTo: "**"
---

# MCP Server Consultation

The SolutionInventory MCP server runs at `http://localhost:5100` and is registered as **"Questionaire MCP"** in VS Code.

## When to consult the MCP first

Before answering questions about any of the following topics, **always call the relevant MCP tool first** to get live workspace data:

| Topic | Tool to call |
|---|---|
| Projects available in the workspace, project IDs | `list_projects` |
| Categories, subcategories, entry IDs | `list_categories` (optional `projectId`) |
| Questionnaire structure or IDs | `list_questionnaires` (optional `projectId`) |
| Answers, responses, ratings for a category | `get_answers_for_category` (optional `projectId`) |
| Tech Radar status or overrides | `get_tech_radar` (optional `projectId`) |
| Consistency, completeness, warnings | `evaluate_responses` |
| JSON schema for workspace or questionnaire export | `get_json_schema` |

## Rules

- Do **not** guess or fabricate workspace data (project names, answers, categories, IDs). Always retrieve it from the MCP.
- If the MCP server is unreachable, say so explicitly rather than guessing.
- Prefer `list_projects` first when a question could relate to a specific project, so the correct `projectId` is known.
- Prefer `list_categories` before any question involving category IDs or entry IDs, so the correct IDs are known.
- Prefer `get_json_schema` before generating or validating any workspace export JSON.
- Omitting `projectId` returns data across **all** projects/questionnaires in the workspace.
