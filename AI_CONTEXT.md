# AI Context for Solution Inventory PWA

## Project Overview
Solution Inventory PWA is a Vue 3 + Vuetify application for documenting solution questionnaires across projects. It uses a project tree on the left, questionnaire tabs in the main area, and a configuration editor in a dialog.

## Current Implementation Status
Implemented features:
- Project tree (v-treeview) with projects and questionnaires, rename/delete, drag-and-drop between projects
- Project import (JSON) and project export (JSON) from the project menu
- Questionnaire tabs with close buttons and per-tab state
- Project Summary tab: opened by clicking a project node; shows a cross-questionnaire matrix (aspects × questionnaires) with colored status chips, search filter, per-accordion expand/collapse, comment tooltips
- Questionnaire editing with multi-answer entries and status/applicability selects
- Configuration editor (dialog) with editable example objects (label + description)
- Auto-save to localStorage with last-saved timestamp
- Resizable sidebar: drag handle on the right edge of the nav drawer, width clamped to 160–640 px, persisted in localStorage under key `sidebar-width`
- Sample data load button in the app bar
- GitHub Pages build/deploy workflow for main, build-only for dev
- Playwright E2E test for creating a new project

Removed/changed features:
- Summary.vue (Technology Radar style) exists in the codebase but is no longer imported or used — superseded by ProjectSummary.vue
- Wizard removed
- Save/Load/Delete buttons removed from the questionnaire workspace

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
    ProjectTreeNav.vue       ← v-treeview nav, context menus, import/export
    Questionnaire.vue        ← questionnaire editor and metadata form
    QuestionnaireWorkspace.vue ← tabs + empty-state
    QuestionnaireConfig.vue  ← category/entry editor
    ProjectSummary.vue       ← cross-questionnaire summary matrix
    Summary.vue              ← legacy, unused (not imported)
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
- project: { id, name, questionnaireIds[] }
- questionnaire: { id, name, categories[] }

Metadata category includes fields:
- productName, company, department, contactPerson, description
- executionType, architecturalRole
- metadataOptions for executionType/architecturalRole (label + description)

## Key Components
- App.vue: app bar, drawer (resizable via drag handle), config dialog, sample loader, clear storage
- ProjectTreeNav.vue: v-treeview navigation, context menus, import/export dialog; clicking a project node opens ProjectSummary tab
- QuestionnaireWorkspace.vue: tabs (type: questionnaire | project-summary) + empty-state
- Questionnaire.vue: questionnaire editor and metadata form
- QuestionnaireConfig.vue: category/entry editor with editable examples list
- ProjectSummary.vue: accordion per category, v-data-table matrix (aspect rows × questionnaire columns), colored status chips, search, comment tooltips

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
