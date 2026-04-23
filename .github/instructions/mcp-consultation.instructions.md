---
applyTo: "**"
---

# MCP Server Consultation

The SolutionInventory MCP server runs at `http://localhost:5100` and is registered as **"Questionaire MCP"** in VS Code.

## When to consult the MCP first

Before answering questions about any of the following topics, **always call the relevant MCP tool first** to get live workspace data:

| Topic | Tool to call |
|---|---|
| Categories, subcategories, entry IDs | `list_categories` |
| Questionnaire structure or IDs | `list_questionnaires` |
| Answers, responses, ratings for a category | `get_answers_for_category` |
| Tech Radar status or overrides | `get_tech_radar` |
| Consistency, completeness, warnings | `evaluate_responses` |
| JSON schema for workspace or questionnaire export | `get_json_schema` |

## Rules

- Do **not** guess or fabricate workspace data (project names, answers, categories, IDs). Always retrieve it from the MCP.
- If the MCP server is unreachable, say so explicitly rather than guessing.
- Prefer `list_categories` before any question involving category IDs or entry IDs, so the correct IDs are known.
- Prefer `get_json_schema` before generating or validating any workspace export JSON.
