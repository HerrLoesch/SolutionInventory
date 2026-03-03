# Development Guidelines - Solution Inventory PWA

## Language

All code, comments, documentation, and commit messages **must be in English**.

- Variable names: English
- Function names: English
- Component names: English
- Comments: English
- Commit messages: English
- Documentation: English

Exception: UI translations for German language features may be kept in German strings where user-facing text requires it.

---

## Architecture Principles

### 1. Component Responsibility

Vue components in `/src/components/` should contain **only the UI logic and presentation logic** directly related to that component:

- Template rendering
- Component-specific state (`ref`, `computed`, local state within `setup()`)
- Event handlers specific to the component
- Component lifecycle operations
- Local form validation and user interactions

**Example - Correct:**
```javascript
// Questionnaire.vue - contains only questionnaire editing logic
const selectedCategory = ref(null)
const currentAnswers = computed(() => questionnaire.value.categories[selectedCategory.value].entries)

function toggleEntry(entryId) {
  selectedCategory.value = entryId
}
```

**Example - Incorrect (belongs in store):**
```javascript
// ❌ DO NOT - database operations belong in store
function saveQuestionnaire(questionnaireId, data) {
  workspace.questionnaires = workspace.questionnaires.map(q => 
    q.id === questionnaireId ? data : q
  )
}
```

### 2. Store Responsibility

The Pinia store (`src/stores/workspaceStore.js`) is responsible for:

- **State management**: Central workspace data model
- **Database operations**: Mutations to workspace, projects, questionnaires
- **Complex business logic**: 
  - Adding/removing/reordering items
  - Importing/exporting data
  - Cross-component state synchronization
  - Persisting data to localStorage
- **Actions that affect multiple components**: Any change that needs to propagate to other parts of the UI

**Example - Correct (in store):**
```javascript
// workspaceStore.js
function moveQuestionnaire(fromProjectId, toProjectId, questionnaireId) {
  const fromProject = this.workspace.projects.find(p => p.id === fromProjectId)
  const toProject = this.workspace.projects.find(p => p.id === toProjectId)
  const index = fromProject.questionnaireIds.indexOf(questionnaireId)
  
  fromProject.questionnaireIds.splice(index, 1)
  toProject.questionnaireIds.push(questionnaireId)
  
  this.triggerAutoSave()
}
```

**Example - Correct (component calls store):**
```javascript
// ProjectTreeNav.vue
function handleDrop(toProjectId) {
  store.moveQuestionnaire(dragState.projectId, toProjectId, dragState.questionnaireId)
}
```

### 3. Data Flow

```
User Interaction (Component)
    ↓
Component Handler
    ↓
Store Action (if data mutation needed)
    ↓
State Update
    ↓
Component Re-renders (via computed/reactive)
```

### 4. Component-Store Interaction Pattern

**DO:**
```javascript
// Component imports and uses store actions
import { useWorkspaceStore } from '../stores/workspaceStore'

export default {
  setup() {
    const store = useWorkspaceStore()
    
    function handleSave() {
      store.updateProjectDeviationSettings(projectId, settings)
    }
    
    return { handleSave }
  }
}
```

**DO NOT:**
```javascript
// ❌ Directly mutating workspace data in component
function handleSave() {
  workspace.projects[0].deviationSettings = settings
  // No clear contract, hard to trace changes, bypasses auto-save
}
```

### 5. When to Create a Store Action

Create a store action when:
- [ ] The change affects the workspace data model
- [ ] The change needs to trigger auto-save
- [ ] Multiple components need to react to this change
- [ ] The logic is complex or involves multiple entities
- [ ] The operation needs to be undoable or traceable

**Example - Add questionnaire:**
```javascript
// ✅ Store action
store.addQuestionnaire('New Questionnaire', null, projectId)

// NOT in component:
// workspace.questionnaires.push({ id: uuid(), name: 'New', categories: [] })
```

### 6. Imports Convention

- **Components**: Use relative imports
  ```javascript
  import Questionnaire from './questionaire/Questionnaire.vue'
  import { useWorkspaceStore } from '../../stores/workspaceStore'
  ```

- **Services**: Use relative imports from appropriate depth
  ```javascript
  import { getDefaultCategories } from '../services/categoriesService'
  ```

- **Store**: Import from stores directory
  ```javascript
  import { useWorkspaceStore } from '@/stores/workspaceStore'
  ```

---

## Code Organization

### Directory Structure

```
src/
├── components/
│   ├── TreeNav.vue                    (navigation, delegates to store)
│   ├── workspace/
│   │   ├── Workspace.vue              (tab management, delegates to store)
│   │   └── WorkspaceConfig.vue        (config UI, delegates to store)
│   ├── questionaire/
│   │   ├── Questionnaire.vue          (editing UI, delegates to store)
│   │   └── QuestionnaireConfig.vue    (config UI, delegates to store)
│   └── projects/
│       ├── ProjectSummary.vue         (display, delegates to store)
│       ├── ProjectMatrix.vue          (matrix view)
│       ├── ProjectSuggestions.vue     (suggestions view)
│       └── CategorySettings.vue       (settings UI, delegates to store)
├── services/
│   └── categoriesService.js           (pure functions, no state)
└── stores/
    └── workspaceStore.js              (ALL state mutations)
```

### Component Separation

- **Presentation Components**: Focus on rendering (ProjectMatrix, ProjectSuggestions)
- **Container Components**: Handle interaction and state (ProjectSummary, Workspace)
- **Configuration Components**: UI for editing settings (CategorySettings, QuestionnaireConfig)

---

## Best Practices

### ✅ DO

- Use store actions for any workspace data mutation
- Use `computed` for derived component state
- Use `ref` for UI-only state (selected items, form inputs, dialogs)
- Keep components focused on their single responsibility
- Document complex store actions with JSDoc comments
- Use TypeScript interfaces or JSDoc for data structures
- Test components with mocked store
- Test store actions independently

### ❌ DO NOT

- Directly mutate `workspace` data in components
- Put business logic in components
- Use components to manage data that multiple components need
- Skip the store for cross-component communication
- Create duplicate state (same data in component AND store)
- Use localStorage directly in components (delegated to store)

---

## Commit Messages

Follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body (optional)>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code reorganization (no behavior change)
- `perf`: Performance improvements
- `test`: Test additions/changes
- `chore`: Build, dependencies, config
- `ci`: CI/CD configuration

**Example:**
```
feat(workspace): add tab close button

- Adds close button to questionnaire tabs
- Delegates deletion to store.closeWorkspaceTab()
- Tests added for tab closure

Closes #42
```

---

## Questions & Discussion

- **Should this be in a component or store?** → Ask: "Does multiple parts of the UI need to react to this?"
- **Is this business logic or presentation logic?** → If it changes the data model → store. If it changes what's displayed → component.
- **When do I need to call the store?** → Whenever workspace data might change.
