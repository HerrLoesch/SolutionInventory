# Solution Inventory PWA

Vue 3 + Vuetify application for documenting solution questionnaires across multiple projects. It uses a project tree for navigation, questionnaire tabs for editing, and a configuration editor in a dialog.

## Features
- Project tree with create/rename/delete and drag-and-drop questionnaires
- Questionnaire tabs with close buttons and per-tab state
- Category-based questionnaire with multi-answer entries
- Status and applicability selects with descriptions
- Configuration editor (dialog) for categories and entries
- Project import/export (JSON)
- Auto-save to localStorage with last-saved indicator
- Sample data loader in the app bar

## Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Build
```bash
npm run preview
```

### E2E Tests
```bash
npm run test:e2e
```

## Project Structure
```
src/
├── main.js
├── App.vue
├── components/
│   ├── ProjectTreeNav.vue
│   ├── QuestionnaireWorkspace.vue
│   ├── Questionnaire.vue
│   └── QuestionnaireConfig.vue
├── services/
│   └── categoriesService.js
└── stores/
    └── workspaceStore.js

data/
└── sample_export.json

tests/
└── project-create.spec.js
```

## Data Model (high level)
- workspace: projects[] + questionnaires[]
- project: name + questionnaireIds[]
- questionnaire: name + categories[]

Metadata includes execution type and architectural role with descriptions.

## Project Import/Export
- Export a single project from the project menu.
- Import a project JSON using the import dialog in the project tree header.

## GitHub Pages Deployment
GitHub Actions builds and deploys on push to main. Pushes and PRs to dev build but do not deploy.

## Dependencies
- Vue 3
- Vuetify 3
- Vite
- Pinia
- Playwright (E2E)