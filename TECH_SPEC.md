# Technical Specification - Solution Inventory PWA

## 1. System Architecture

### 1.1 Frontend Architecture
- Type: Single Page Application (SPA)
- Framework: Vue 3 (Composition API)
- Build System: Vite
- UI Library: Vuetify 3
- State Management: Pinia

### 1.2 Application Layers
```
┌─────────────────────────────────────┐
│         User Interface Layer        │
│  (Vuetify Components, Vue Template) │
└──────────────────────┬──────────────┘
┌──────────────────────▼──────────────┐
│        Component Logic Layer        │
│  (App.vue, Questionnaire.vue)       │
└──────────────────────┬──────────────┘
┌──────────────────────▼──────────────┐
│        State and Services Layer     │
│  (Pinia, categoriesService.js)      │
└─────────────────────────────────────┘
```

## 2. File Structure and Responsibilities

### Core Files
- src/App.vue
  - App shell, app bar actions, navigation drawer, configuration dialog
- src/components/ProjectTreeNav.vue
  - Project tree UI, context menus, import/export dialog
- src/components/QuestionnaireWorkspace.vue
  - Questionnaire tabs, empty-state, active tab routing
- src/components/Questionnaire.vue
  - Category navigation and questionnaire editor
- src/components/QuestionnaireConfig.vue
  - Configuration editor for categories and entries
- src/services/categoriesService.js
  - Default category data and metadata options
- src/stores/workspaceStore.js
  - Workspace state, persistence, import/export helpers

### Data Files
- data/sample_export.json
  - Sample workspace/project data for quick loading

## 3. Data Model

### Workspace Schema
```typescript
interface Workspace {
  id: string;
  projects: Project[];
  questionnaires: Questionnaire[];
}

interface Project {
  id: string;
  name: string;
  questionnaireIds: string[];
}

interface Questionnaire {
  id: string;
  name: string;
  categories: Category[];
}
```

### Category Schema
```typescript
interface Category {
  id: string;
  title: string;
  desc: string;
  isMetadata?: boolean;
  metadata?: Metadata;
  entries?: Entry[];
}

interface Metadata {
  productName: string;
  company: string;
  department: string;
  contactPerson: string;
  description: string;
  executionType: string;
  architecturalRole: string;
}

interface Entry {
  id: string;
  aspect: string;
  examples: Example[];
  applicability?: string;
  answers: Answer[];
}

interface Example {
  label: string;
  description: string;
}

interface Answer {
  technology: string;
  status: string;
  comments: string;
}
```

## 4. State Management and Persistence

### Pinia Store
- Tracks workspace, open tabs, and active questionnaire
- Provides create/rename/delete for projects and questionnaires
- Handles project import/export

### localStorage
- Key: solution-inventory-data
- Auto-save on state change
- Loaded on app start if present

## 5. Component Behavior Highlights

### App.vue
- App bar actions: Sample data, configuration dialog, clear storage
- Drawer toggle for project tree
- Last-saved indicator

### ProjectTreeNav.vue
- Project tree with context menus
- Import dialog with JSON validation
- Export project JSON download

### QuestionnaireWorkspace.vue
- Tabs for open questionnaires
- Empty-state when no tabs are open

### Questionnaire.vue
- Category navigation within a questionnaire
- Metadata form with execution type and architectural role
- Multi-answer entries with status and applicability selects

### QuestionnaireConfig.vue
- Category and entry editor
- Examples list supports label + description

## 6. Import/Export Format

### Project Export
- Single project with its questionnaires
- JSON downloaded from project menu

### Project Import
- JSON validated in import dialog
- Creates a project and associated questionnaires

## 7. Build, Test, and Deployment

### Scripts
```
npm run dev
npm run build
npm run preview
npm run test:e2e
```

### GitHub Actions
- Build and deploy on push to main
- Build only on push/PR to dev

### Playwright
- tests/project-create.spec.js validates project creation flow
