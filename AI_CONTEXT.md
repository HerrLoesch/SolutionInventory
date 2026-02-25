# AI Context for Solution Inventory PWA

## Project Overview
Solution Inventory PWA is a Vue 3 + Vuetify application for documenting solution questionnaires across projects. It uses a project tree on the left, questionnaire/project tabs in the main workspace area, and a configuration editor in a dialog.

## Current Implementation Status
Implemented features:
- Project tree (v-treeview) with projects and questionnaires, rename/delete
- Drag-and-drop questionnaires **between** projects and **reordering within** a project
- Project import (JSON) and project export (JSON) from the project menu
- Questionnaire tabs with close buttons and per-tab state
- Project Summary tab: opened by clicking a project node; shows a cross-questionnaire matrix (aspects × questionnaires) with colored status chips, search filter, per-accordion expand/collapse, comment tooltips
- **Deviation highlighting in Project Summary**: per-category/entry settings (CategorySettings.vue) control which aspects must match across questionnaires; violations shown with red exclamation icon and orange row highlight
- **Reference questionnaire**: each project can designate one questionnaire as the reference; all others are compared against it; configurable via a toggle in the metadata section
- Questionnaire editing with multi-answer entries, status/applicability selects, and an entry-level general comment field
- Configuration editor (dialog) with editable category/entry structure and example objects
- Auto-save to localStorage with last-saved timestamp
- Resizable sidebar: drag handle on the right edge of the nav drawer, width clamped 160–640 px, persisted under `sidebar-width`
- Sample data load button in the app bar
- GitHub Pages build/deploy workflow for main, build-only for dev
- Playwright E2E test for creating a new project

Removed/changed:
- `QuestionnaireWorkspace.vue` renamed to `Workspace.vue`
- `Summary.vue` (legacy Technology Radar style) deleted — superseded by `ProjectSummary.vue`
- Wizard removed
- Save/Load/Delete buttons removed from the workspace

## Technology Stack
- Framework: Vue 3 (Composition API)
- Build Tool: Vite
- UI Library: Vuetify 3
- State Management: Pinia store
- Persistence: Browser localStorage
- Tests: Playwright (E2E)

## Project Structure (current)
```
/src
  /components
    ProjectTreeNav.vue       ← v-treeview nav, context menus, import/export, drag-and-drop reorder
    Questionnaire.vue        ← questionnaire editor, metadata form, reference questionnaire toggle
    Workspace.vue            ← tabs (questionnaire | project-summary) + empty-state
    QuestionnaireConfig.vue  ← category/entry editor
    ProjectSummary.vue       ← cross-questionnaire summary matrix, deviation highlights, settings gear
    CategorySettings.vue     ← per-category/entry deviation settings (checkbox tree)
  /services
    categoriesService.js
  /stores
    workspaceStore.js
/data
  sample_export.json
/.github/workflows
  build-and-deploy.yml
/tests
  project-create.spec.js
```

## UI Overview
- App bar: last-saved chip, Sample button, Configuration icon button, Clear data button
- Navigation drawer: project tree with context menus
- Main area: questionnaire tabs and editor, empty-state prompt when no tabs open
- Configuration: large dialog with category/entry editor

## Data Model (current)
Workspace data in Pinia:
- workspace: { id, projects[], questionnaires[] }
- project: { id, name, questionnaireIds[], deviationSettings{}, referenceQuestionnaireId }
- questionnaire: { id, name, categories[] }

`deviationSettings` is a flat map of `categoryId | entryId → boolean` where `true` means no deviation allowed.
`referenceQuestionnaireId` is the ID of the questionnaire all others are compared against (empty = no reference).

Metadata category includes fields:
- productName, company, department, contactPerson, description
- executionType, architecturalRole
- metadataOptions for executionType/architecturalRole (label + description)

## Key Components
- **App.vue**: app bar, drawer (resizable via drag handle), config dialog, sample loader, clear storage
- **ProjectTreeNav.vue**: v-treeview navigation, context menus, import/export dialog; drag-and-drop moves and reorders questionnaires; clicking a project node opens ProjectSummary tab
- **Workspace.vue**: tabs (type `questionnaire` | `project-summary`) + empty-state
- **Questionnaire.vue**: questionnaire editor, metadata form, reference questionnaire toggle (visible when questionnaire belongs to a project)
- **QuestionnaireConfig.vue**: category/entry editor with editable examples list
- **ProjectSummary.vue**: accordion per category with violation icons (red `!`), v-data-table matrix (aspect rows × questionnaire columns), colored status chips, search, comment tooltips, gear button opens CategorySettings dialog
- **CategorySettings.vue**: expandable tree of categories and entries with checkboxes — checked = no deviations allowed

## Store Actions (key)
- addProject, deleteProject, renameProject
- addQuestionnaire, deleteQuestionnaire, renameQuestionnaire
- moveQuestionnaire(fromProjectId, toProjectId, questionnaireId)
- reorderQuestionnaire(projectId, draggedId, beforeId)
- updateProjectDeviationSettings(projectId, settings)
- setReferenceQuestionnaire(projectId, questionnaireId) — toggles on/off
- importProject, exportProject
- openQuestionnaire, openProjectSummary, closeWorkspaceTab

## Commands
- npm run dev
- npm run build
- npm run preview
- npm run test:e2e

## Environment & Browser Compatibility
- Runs on Node.js 14+ environments
- Target browsers: Modern browsers with ES2020+ support

## Import Paths Convention
- Relative imports for components and utilities
- Absolute-style imports for services

## Future Enhancement Areas
- Backend API / database persistence
- User authentication and authorization
- Multi-user collaboration features
- Real-time sync across devices/users
- Advanced filtering and search in questionnaire
- Export to Excel/PDF formats
- Revision history / change tracking
- Undo/redo functionality
- Keyboard shortcuts
- Custom themes
- API integrations
