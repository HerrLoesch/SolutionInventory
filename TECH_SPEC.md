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
│  (App.vue, Questionnaire.vue, ...)  │
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
  - Drag-and-drop: move questionnaires between projects and reorder within a project
- src/components/Workspace.vue
  - Questionnaire tabs, empty-state, active tab routing
- src/components/Questionnaire.vue
  - Category navigation and questionnaire editor
  - Reference questionnaire toggle in metadata section
- src/components/QuestionnaireConfig.vue
  - Configuration editor for categories and entries
- src/components/ProjectSummary.vue
  - Cross-questionnaire summary matrix with deviation violation highlights
  - Gear button opens CategorySettings dialog
- src/components/CategorySettings.vue
  - Expandable category/entry tree with checkboxes for deviation rules
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
  questionnaireIds: string[];        // ordered list; order = display/export order
  deviationSettings: Record<string, boolean>; // categoryId|entryId → true means no deviation allowed
  referenceQuestionnaireId: string;  // empty = no reference set
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
  entryComment?: string;
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

### Pinia Store (`workspaceStore.js`)
- Tracks workspace, open tabs, and active questionnaire
- Key actions:
  - `addProject`, `deleteProject`, `renameProject`
  - `addQuestionnaire`, `deleteQuestionnaire`, `renameQuestionnaire`
  - `moveQuestionnaire(fromProjectId, toProjectId, questionnaireId)` — cross-project move
  - `reorderQuestionnaire(projectId, draggedId, beforeId)` — in-project reorder; mutates `questionnaireIds` array directly
  - `updateProjectDeviationSettings(projectId, settings)` — replaces `project.deviationSettings`
  - `setReferenceQuestionnaire(projectId, questionnaireId)` — toggles `project.referenceQuestionnaireId`
  - `importProject`, `exportProject`
  - `openQuestionnaire`, `openProjectSummary`, `closeWorkspaceTab`

### localStorage
- Key: `solution-inventory-data` — full workspace JSON
- Key: `sidebar-width` — navigation drawer width in pixels (integer)
- Auto-save on state change via `watch` in `startAutoSave()`
- Loaded on app start if present

## 5. Component Behavior Highlights

### App.vue
- App bar actions: Sample data, configuration dialog, clear storage
- Drawer toggle for project tree
- Last-saved indicator
- Resizable sidebar: 5 px drag handle on right edge of `v-navigation-drawer`, width clamped 160–640 px, persisted under `sidebar-width`

### ProjectTreeNav.vue
- v-treeview with context menus
- Import dialog with JSON validation; export project JSON download
- Click on a project node opens ProjectSummary tab
- **Move between projects**: drag a questionnaire row, drop on a project folder row (highlights with dashed blue border)
- **Reorder within project**: drag a questionnaire row over another questionnaire row; blue top-border indicator shows insertion point; drop calls `reorderQuestionnaire`
- Both operations use debounced `dragleave` (60 ms) to avoid flicker; `dragstart` uses `stopPropagation` to prevent parent capture

### Workspace.vue
- Tabs for open items (type `questionnaire` or `project-summary`)
- Empty-state when no tabs are open
- Passes `:questionnaire-id` prop to `Questionnaire.vue`

### Questionnaire.vue
- Category navigation within a questionnaire
- Metadata form with execution type and architectural role
- `'Not specified'` in either dropdown bypasses `appliesToMatches` filtering (all entries visible)
- Multi-answer entries with status and applicability selects
- **Reference questionnaire toggle**: visible only when questionnaire belongs to a project; stored as `project.referenceQuestionnaireId`; toggles off if clicked again

### ProjectSummary.vue
- Opened via `store.openProjectSummary(projectId)` from project tree
- Gear button (⚙) before the search field opens the CategorySettings dialog for the current project
- Accordion sections per category; v-data-table matrix (aspect × questionnaire)
- Status chips colored by value; comment tooltips
- **Violation detection** (`isViolation(row)`):
  - Calls `isDeviationAllowed(row)` using `project.deviationSettings` (entry-level overrides category-level; default = allowed)
  - Calls `hasDeviation(entryId)` using reference logic (see below)
  - If violation: red `mdi-exclamation-thick` in category accordion header + orange row highlight via `:deep(tr.row-violation td)`
- **Deviation logic** (`hasDeviation`):
  - *With reference*: for each non-reference questionnaire, flag if an answer has a different status than the reference for the same technology, or if there are answers not present in the reference. Subset (fewer answers) is NOT a deviation.
  - *Without reference*: flag if the same technology appears with different statuses across questionnaires.

### CategorySettings.vue
- Used inside ProjectSummary dialog
- Receives `categories` (unique list from all questionnaires) and `modelValue` (deviationSettings object)
- Checkbox tree: checked = no deviation allowed (default unchecked)
- Category toggle sets category-level key and removes all entry-level overrides
- Entry toggle creates entry-level override only when it differs from the inherited category value
- Emits `update:modelValue` on every change → immediately saved via `updateProjectDeviationSettings`

### QuestionnaireConfig.vue
- Category and entry editor
- Examples list supports label + description

## 6. Import/Export Format

### Project Export
```json
{
  "project": { "id": "...", "name": "..." },
  "questionnaires": [
    { "id": "...", "name": "...", "categories": [ ... ] }
  ]
}
```
Questionnaire order in the array matches `project.questionnaireIds` order.

### Project Import
- JSON validated in import dialog
- Creates a project and associated questionnaires
- `deviationSettings` and `referenceQuestionnaireId` are not included in export (project-specific, reset on import)

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
