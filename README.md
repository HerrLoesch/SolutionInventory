# Solution Inventory

<p align="center">
  <img src="Client/public/Logo-Large.png" alt="Solution Inventory" width="180" />
</p>

## What is Solution Inventory?

Solution Inventory is a **questionnaire-based assessment tool** for systematically documenting and comparing technology decisions across software projects within an organization. It helps teams and architects capture which technologies, frameworks, practices, and tools are in use — and at what maturity level — by guiding them through a structured, category-based questionnaire for each solution.

The collected data feeds into cross-project analysis views such as a **Project Summary Matrix**, **Deviation Analysis**, and an interactive **Tech Radar** visualization, enabling organizations to identify patterns, detect inconsistencies, and make informed governance decisions across their solution landscape.

## Who is it for?

- **Software Architects** evaluating and governing technology choices across teams
- **Engineering Managers** seeking visibility into the technologies used by their projects
- **Teams** documenting their solution stacks in a consistent, comparable format
- **Technology Governance Boards** tracking adoption, trial, and retirement of technologies

## How does it work?

### Core Workflow

1. **Create Projects** — Each project represents a software solution to be assessed.
2. **Add Questionnaires** — Each project can contain multiple questionnaires (e.g. one per team, component, or assessment cycle).
3. **Answer Questions** — Questions are organized in categories (Architecture, Security, DevOps, etc.). Each entry offers predefined answer options with status levels (Adopt / Trial / Assess / Hold / Retire) and an applicability toggle.
4. **Analyze** — Use the Project Summary, Tech Radar, and Deviation Analysis to compare answers across questionnaires and identify patterns.
5. **Export** — Export project data as JSON or Excel, or export the Tech Radar as a ThoughtWorks-compatible JSON or PNG image.

### Data Storage

- **Web App (PWA):** All data is stored exclusively in the browser's Local Storage. There is no server-side storage, accounts, or synchronization. Clearing browser data removes everything.
- **Electron App (Windows & Linux):** All data is stored locally on the device in a user-chosen directory as a single JSON file (`solution-inventory-data.json`). No data is sent to any server or cloud service.

## Features

### Project & Questionnaire Management
- Project tree with create, rename, delete and drag-and-drop (move and reorder questionnaires)
- Questionnaire tabs with close buttons and per-tab state
- Reference questionnaire: designate one questionnaire per project as the baseline for comparison
- Project import/export (JSON and Excel)

### Questionnaire Editing
- Category-based questionnaire with multi-answer entries and entry-level comments
- Solution metadata: product name, company, department, contact person, execution type, and architectural role
- Status selects (Adopt / Trial / Assess / Hold / Retire) and applicability toggles with descriptions
- Entries can be hidden per questionnaire to reduce noise
- Configuration editor (dialog) for categories and entries
- Sample data loader in the app bar

### Tech Radar
Interactive technology radar visualization inspired by the [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar):
- Drag & drop category chips to assign categories to quadrants (first 3 categories get dedicated quadrants, remaining grouped in 4th)
- Click status rings (Adopt / Trial / Assess / Hold / Retire) to toggle visibility
- Dynamic ring sizing: hidden rings release space for visible ones to expand
- Search and filter by answer type (Tools / Practices) and by category
- Per-blip overrides: custom status, category assignment, and radar-specific comments
- Interactive legends with hover sync and detail dialogs
- Export as ThoughtWorks Build-Your-Own-Radar JSON or download as PNG

### Project Summary & Analysis
- **Project Summary Matrix:** cross-questionnaire matrix (aspect × questionnaire) with colored status chips, comment tooltips, search filter, and collapsible categories
- **All Suggestions:** aggregated view of all questionnaire answers with radar toggle buttons
- **Deviation Analysis:** configure per-category/aspect rules; violations highlighted with red icons and orange row tint

### UI & UX
- Resizable sidebar: drag the right edge of the navigation drawer (160–640 px, persisted)
- Auto-save with last-saved indicator
- Installable as a Progressive Web App (PWA)

## Architecture

### Frontend (Vue 3 + Vuetify)

The client application lives in `Client/` and is built with **Vue 3** (Composition API, `<script setup>`), **Vuetify 3** for the component library, and **Pinia** for state management. **Vite** is used as the build tool with PWA support via `vite-plugin-pwa`.

```
User Interaction (Component)  →  Component Handler  →  Store Action  →  State Update  →  Reactive Re-render
```

- **Components** (`src/components/`) handle UI logic and presentation only.
- **Store** (`src/stores/workspaceStore.js`) owns all workspace state and mutation logic — project CRUD, questionnaire management, import/export, auto-save, and cross-component state synchronization.
- **Services** (`src/services/categoriesService.js`) provide the default questionnaire template (categories, entries, status options, metadata options).

### Electron Shell

The Electron wrapper (`Client/electron/`) enables desktop distribution for Windows and Linux. It provides native file-system access, a directory picker for workspace storage, and a native menu bar. The same Vue/Vuetify frontend runs inside the Electron `BrowserWindow`.

### MCP Server (.NET 9)

The `MCP/McpServer/` directory contains a .NET 9 backend implementing the **Model Context Protocol (MCP)** over SSE transport. It allows AI assistants (e.g. GitHub Copilot) to query workspace data programmatically via JSON-RPC.

Available MCP tools:
| Tool | Description |
|---|---|
| `list_categories` | List all categories and their entries |
| `list_questionnaires` | List questionnaire structure and IDs |
| `get_answers_for_category` | Get filtered answers by category, entry, or questionnaire |
| `get_tech_radar` | Get Tech Radar entries and overrides |
| `evaluate_responses` | Evaluate response consistency and completeness |
| `get_json_schema` | Get JSON schema for workspace or questionnaire export |

The MCP server includes a browser-based management UI at `http://localhost:5100` for loading workspace data and monitoring sessions.

### E2E Tests

End-to-end tests use **Cucumber.js** with **Playwright** for browser automation. Feature files in `Client/tests/features/` describe scenarios in Gherkin syntax (project CRUD, questionnaire management, import/export). Step definitions in `Client/tests/step_definitions/` implement the browser interactions.

## Quick Start

### Prerequisites

- **Node.js** (for the frontend)
- **.NET 9 SDK** (optional, only for the MCP server)

### Installation
```bash
cd Client
npm install
```

### Development (PWA)
```bash
npm run dev
```

### Development (Electron, Windows & Linux)
```bash
npm run electron:dev
```

### Production Build (PWA)
```bash
npm run build
```

### Production Build (Electron, Windows & Linux)
```bash
npm run electron:build
```

### Preview Build (PWA)
```bash
npm run preview
```

### Preview Build (Electron, Windows & Linux)
```bash
npm run electron:preview
```

### MCP Server
```bash
cd MCP/McpServer
dotnet run
```
The server starts at `http://localhost:5100`. Open this URL to access the management UI for loading workspace data.

### E2E Tests
```bash
npm run test:e2e
```

### Test Report
```bash
npm run test:e2e:report
```

## Project Structure
```
Client/                         # Frontend application
├── src/
│   ├── main.js                 # App entry point (Vue + Vuetify + Pinia setup)
│   ├── App.vue                 # Root component (app bar, sidebar, workspace)
│   ├── components/
│   │   ├── TreeNav.vue         # Project & questionnaire tree navigation
│   │   ├── workspace/
│   │   │   ├── Workspace.vue          # Tab container for questionnaires & summaries
│   │   │   └── WorkspaceConfig.vue    # Workspace management dialog
│   │   ├── questionaire/
│   │   │   ├── Questionnaire.vue      # Category-based questionnaire editor
│   │   │   ├── QuestionnaireConfig.vue # Category & entry configuration
│   │   │   └── EntryExamples.vue      # Example answers for entries
│   │   └── projects/
│   │       ├── ProjectSummary.vue     # Cross-questionnaire summary & analysis
│   │       ├── ProjectMatrix.vue      # Aspect × questionnaire comparison matrix
│   │       ├── ProjectSuggestions.vue # Aggregated answer view with radar toggles
│   │       ├── CategorySettings.vue   # Deviation analysis rule editor
│   │       └── TechRadar.vue          # Interactive Tech Radar visualization
│   ├── services/
│   │   └── categoriesService.js       # Default questionnaire template data
│   ├── stores/
│   │   └── workspaceStore.js          # Pinia store (state, actions, persistence)
│   └── utils/
│       └── techRadarExport.js         # Tech Radar export helpers
├── electron/
│   ├── main.js                 # Electron main process
│   └── preload.js              # Electron preload script (IPC bridge)
├── tests/                      # E2E tests (Cucumber + Playwright)
│   ├── features/               # Gherkin feature files
│   ├── step_definitions/       # Step implementation
│   └── support/                # Test world configuration
├── vite.config.js              # Vite config (PWA + Electron modes)
└── package.json

MCP/                            # MCP Server (.NET 9)
└── McpServer/
    ├── Program.cs              # Server setup, routes, middleware
    ├── Data/
    │   └── ProjectRepository.cs   # Workspace data access layer
    ├── Logic/
    │   └── QuestionnaireEvaluator.cs  # Response evaluation logic
    ├── Models/                 # Data model classes
    ├── Services/
    │   ├── McpSessionManager.cs    # MCP protocol (SSE + JSON-RPC)
    │   ├── ConfigService.cs        # Server configuration
    │   ├── JsonSchemas.cs          # JSON schema generation
    │   └── LogBroadcaster.cs       # WebSocket log streaming
    └── wwwroot/                # Management UI (static files)
```

## Data Model

```
Workspace
├── projects[]
│   ├── id, name
│   ├── questionnaireIds[]         # References to questionnaires
│   ├── radar[]                    # Tech Radar blips
│   │   ├── entryId, option        # Which technology
│   │   ├── status, category       # Overrides
│   │   └── shortComment, description, link
│   ├── radarCategoryOrder[]       # Quadrant assignment order
│   ├── deviationSettings{}        # Deviation analysis rules
│   └── referenceQuestionnaireId   # Baseline questionnaire
└── questionnaires[]
    ├── id, name
    └── categories[]
        ├── id, title, desc
        ├── isMetadata             # Metadata category (solution description)
        ├── metadata{}             # Product name, company, contact, etc.
        └── entries[]
            ├── id, label, desc
            ├── answers[]          # Selected options with status
            └── comment            # Entry-level notes
```

Solution metadata includes **execution type** (Web App, Desktop, Mobile, Headless Service, etc.) and **architectural role** (Standalone, Microservice, Plugin, AI/ML Engine, etc.) which control the applicability of questionnaire entries.

## Tech Radar Usage

### Adding Blips
In the **Matrix** or **All Suggestions** tab, click the radar icon next to any technology answer to add it to the Tech Radar.

### Quadrant Assignment
- Drag & drop the category chips at the top of the Tech Radar to reorder them
- The first 3 categories are assigned to dedicated quadrants (top-left, top-right, bottom-left)
- All remaining categories are grouped in the 4th quadrant (bottom-right)

### Status Ring Visibility
Click any status label (Adopt, Trial, Assess, Hold, Retire) below the radar to toggle its visibility:
- Hidden rings are grayed out
- Blips with hidden status disappear
- Visible rings expand to fill available space

### Customization
Click the menu (⋮) next to any blip in the legend to:
- **Edit**: Override status, assign to different category/quadrant, add radar-specific comments
- **Remove**: Delete from radar

### Export
Use the menu (⋮) in the toolbar to:
- Export as ThoughtWorks Build-Your-Own-Radar JSON format
- Download radar visualization as PNG image

## Deployment

### GitHub Pages (PWA)
GitHub Actions builds and deploys automatically on push to `main`. The web version is hosted at GitHub Pages. Pushes and PRs to `dev` build but do not deploy.

### Electron (Desktop)
```bash
cd Client
npm run electron:build
```
Produces platform-specific installers in `Client/release/`.

## Dependencies

### Frontend
- [Vue 3](https://vuejs.org/) — Reactive UI framework (Composition API)
- [Vuetify 3](https://vuetifyjs.com/) — Material Design component library
- [Pinia](https://pinia.vuejs.org/) — State management
- [Vite](https://vitejs.dev/) — Build tool with HMR
- [markdown-it](https://github.com/markdown-it/markdown-it) / [md-editor-v3](https://github.com/imzbf/md-editor-v3) — Markdown rendering and editing
- [html-to-image](https://github.com/nicbarker/html-to-image) — PNG export for Tech Radar

### Desktop
- [Electron](https://www.electronjs.org/) — Cross-platform desktop shell

### Testing
- [Playwright](https://playwright.dev/) — Browser automation
- [Cucumber.js](https://cucumber.io/) — BDD test framework

### MCP Server
- [.NET 9](https://dotnet.microsoft.com/) — Backend runtime
- ASP.NET Core Minimal APIs — HTTP + SSE + WebSocket endpoints