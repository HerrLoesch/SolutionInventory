# AI Context for Solution Inventory PWA

## Project Overview
**Solution Inventory PWA** is a progressive web application built with Vue 3 and Vite that helps organizations document and track technology solutions, architectural decisions, and software components. The application features a tab-based interface with questionnaire, visualization (Technology Radar), and configuration capabilities.

## Current Implementation Status
✅ **Fully Implemented**:
- Tab-based navigation (Questionnaire, Summary, Configuration)
- Category-based questionnaire with dynamic answers
- Technology Radar visualization (SVG-based)
- Configuration editor for categories and entries
- Auto-save with localStorage
- JSON export/import (multiple format support)
- Sample data loading
- PWA capabilities
- Responsive Material Design UI

## Core Purpose
The application provides a structured questionnaire-based interface for documenting:
- Solution metadata (product name, company, department, contact person, description)
- Architectural patterns and decisions
- Front-end technology stacks
- Back-end frameworks and patterns
- Database and data access strategies
- Development practices and tools
- Infrastructure and deployment approaches

## Technology Stack
- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite 4.4.9
- **UI Library**: Vuetify 3.3.0
- **PWA Plugin**: vite-plugin-pwa 0.14.7
- **Runtime**: Node.js with npm
- **Styling**: Scoped CSS in Vue components + Vuetify Material Design
- **State Management**: Vue 3 reactive refs and computed properties
- **Persistence**: Browser localStorage
- **Visualization**: Native SVG (no chart libraries)
- **Export**: JSON format

## Project Structure
```
/src
  ├── main.js                           # Application entry point
  ├── App.vue                           # Root component with tabs, auto-save, global actions
  ├── components/
  │   ├── Questionnaire.vue             # Main questionnaire interface
  │   ├── Summary.vue                   # Technology Radar visualization
  │   └── QuestionnaireConfig.vue       # Configuration editor
  ├── services/
  │   └── categoriesService.js          # Category data and structure
  └── utils/
/public                                  # Static assets
/data
  └── sample_export.json                # Sample data for quick start
/scripts
  └── test_export_node.js               # Excel export test script
```

## Key Features

### 1. Tab-Based Navigation
- **Questionnaire Tab**: Main data entry interface
- **Summary Tab**: Technology Radar visualization
- **Configuration Tab**: Dynamic category/entry editor
- State preserved when switching tabs

### 2. Auto-Save with localStorage
- Automatic save on any data change (deep watch)
- Loads saved data on application start
- Displays last saved timestamp (HH:MM)
- Storage version control
- Clear storage option with confirmation

### 3. Technology Radar Visualization
- SVG-based interactive radar chart
- Four status rings: Adopt, Assess, Hold, Retire
- Eight radial segments for categories
- Technology bubbles with abbreviated labels
- Hover tooltips with full details
- Color-coded by status
- Updates in real-time

### 4. Configuration Editor
- Add/edit/delete categories dynamically
- Add/edit/delete entries (aspects) in categories
- Auto-generate IDs from titles
- No code changes required
- Supports metadata vs. regular category types

### 5. Questionnaire Interface
- Category-based navigation with sidebar
- Multiple answers per aspect
- Status tracking (Adopt/Assess/Hold/Retire)
- Rich text input with auto-grow textareas
- Add/delete answer functionality

### 6. Data Management
- **Export**: JSON format with object wrapper
- **Import**: Supports array and object formats
- **Sample Data**: Quick load for demos/training
- **Validation**: Format checking on import
- **Backup**: Export for data backup

## Data Model
### Category Structure
```javascript
{
  id: string,
  title: string,
  desc: string,
  isMetadata?: boolean,
  entries?: Array<{
    id: string,
    aspect: string,
    examples: string,
    answers: Array<{
      technology: string,
      status: string (Adopt|Assess|Hold|Retire),
      comments: string
    }>
  }>,
  metadata?: {
    productName: string,
    company: string,
    department: string,
    contactPerson: string,
    description: string
  }
}
```

## Component Hierarchy
```
App.vue (root)
├── v-app-bar
│   ├── v-tabs (Questionnaire | Summary | Configuration)
│   ├── Last Saved Indicator (v-chip)
│   └── Action Buttons (Save, Load, Load Sample, Clear)
├── v-main
│   └── v-window (tab content)
│       ├── Questionnaire.vue (tab 1)
│       │   ├── Category sidebar (v-list)
│       │   └── Entry cards with answers
│       ├── Summary.vue (tab 2)
│       │   ├── Metadata card
│       │   ├── Technology Radar (SVG)
│       │   └── Legend
│       └── QuestionnaireConfig.vue (tab 3)
│           ├── Category list (left panel)
│           └── Category/Entry editor (right panel)
└── Hidden file input for JSON import
```

## Known Issues & Fixes
- ✅ **Add Answer Button Issue**: Fixed by adding null-check for `cat.entries` in `findEntry()` function (metadata categories don't have entries)
- ✅ **Import Format Flexibility**: Now supports both array `[...]` and object `{categories: [...]}` formats
- ✅ **Data Persistence**: Implemented with localStorage auto-save

## Development Commands
- `npm run dev` - Start development server with Vite hot reload (typically http://localhost:5173)
- `npm run build` - Build for production (outputs to /dist)
- `npm run preview` - Preview production build
- `npm run test-export` - Test Excel export functionality with Node.js script

## Code Patterns & Best Practices

### Vue 3 Composition API
- **Reactive State**: Using `ref()` for mutable state, `computed()` for derived data
- **Deep Watching**: `watch(categories, ..., { deep: true })` for auto-save
- **Props & Emits**: Parent-child communication via props and @emit events
- **Template Refs**: `ref()` for accessing child component methods

### Vuetify Components
- Comprehensive Material Design component usage
- v-model for two-way binding
- Grid system: v-container, v-row, v-col
- Cards, buttons, forms, lists, tabs, windows
- Icons from MDI (Material Design Icons)
- Tooltips for enhanced UX

### localStorage Pattern
```javascript
// Structure
{
  version: 1,
  timestamp: "ISO 8601",
  categories: [/* array */]
}

// Auto-save on changes
watch(categories, () => {
  saveToLocalStorage()
}, { deep: true })

// Auto-load on mount
onMounted(() => {
  loadFromLocalStorage()
})
```

### SVG Visualization
- ViewBox for responsive scaling
- Computed properties for dynamic positioning
- Event handlers for interactivity (mouseenter/mouseleave)
- Color coding with opacity
- Text labels with positioning calculations

## Environment & Browser Compatibility
- Runs on Node.js 14+ environments
- Target browsers: Modern browsers with ES2020+ support
- PWA-capable browsers (service worker support)

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
