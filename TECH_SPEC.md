# Technical Specification - Solution Inventory PWA

## 1. System Architecture

### 1.1 Frontend Architecture
- **Type**: Single Page Application (SPA)
- **Framework**: Vue 3 (Composition API)
- **Build System**: Vite 4.4.9
- **Plugin**: Vite PWA Plugin 0.14.7 (for service worker and offline support)
- **Component Model**: Single File Components (.vue)

### 1.2 Application Layers
```
┌─────────────────────────────────────┐
│         User Interface Layer        │
│  (Vuetify Components, Vue Template) │
└──────────────────────┬──────────────┘
┌──────────────────────▼──────────────┐
│        Component Logic Layer        │
│  (Questionnaire.vue, App.vue)       │
└──────────────────────┬──────────────┘
┌──────────────────────▼──────────────┐
│         Service Layer               │
│  (categoriesService.js)             │
└──────────────────────┬──────────────┘
┌──────────────────────▼──────────────┐
└─────────────────────────────────────┘
```

## 2. Technology Stack Details

### Frontend Dependencies
```json
{
  "vue": "^3.3.4",           // Progressive JavaScript framework
  "vuetify": "^3.3.0"        // Material Design component library
}
```

### Development Dependencies
```json
{
  "vite": "^4.4.9",                    // Next generation frontend tooling
  "@vitejs/plugin-vue": "^4.0.0",     // Vue 3 support for Vite
  "vite-plugin-pwa": "^0.14.7"        // PWA capabilities
}
```

## 3. File Structure and Responsibilities

### Core Files
- **src/App.vue**: Root Vue component with tab navigation
  - Manages three main tabs: Questionnaire, Summary, Configuration
  - Implements auto-save functionality with localStorage
  - Provides global actions: Save JSON, Load JSON, Load Sample, Clear Storage
  - Displays last saved timestamp indicator
  - Handles file import/export coordination
- **src/main.js**: Application entry point, Vue instance creation, Vuetify initialization
- **src/components/Questionnaire.vue**: Main questionnaire UI component
  - Manages category selection
  - Renders questionnaire entries
  - Handles answer input/edit/delete operations
  - Provides JSON export/import functionality
- **src/components/Summary.vue**: Technology Radar visualization component
  - Displays interactive SVG-based Technology Radar
  - Shows all technologies positioned by status (Adopt/Assess/Hold/Retire)
  - Provides tooltip with technology details on hover
  - Renders metadata summary (product info)
  - Includes color-coded legend
- **src/components/QuestionnaireConfig.vue**: Configuration editor component
  - Add, edit, delete categories
  - Add, edit, delete entries (aspects) within categories
  - Dynamic ID generation based on titles
  - Support for metadata vs. regular categories

### Services
- **src/services/categoriesService.js**
  - Exports `getCategoriesData()` function
  - Returns complete category data structure
  - Categories covered:
    - Solution Description (metadata)
    - Architecture (8 aspects)
    - Front-End
    - Back-End
    - Data & Persistence
    - Development & Quality
    - Infrastructure

### Data Files
- **data/sample_export.json**: Sample data for demonstration purposes
  - Can be loaded via "Load Sample" button
  - Contains pre-filled categories with example technologies

## 4. Data Model

### Category Schema
```typescript
interface Category {
  id: string;                    // Unique identifier
  title: string;                 // Display title
  desc: string;                  // Description
  isMetadata?: boolean;         // Flag for metadata category
  metadata?: {                  // For metadata category
    productName: string;
    company: string;
    department: string;
    contactPerson: string;
    description: string;
  };
  entries?: Entry[];            // For regular categories
}

interface Entry {
  id: string;                    // Unique identifier
  aspect: string;               // Question/aspect title
  examples: string;             // Example options
  answers: Answer[];            // User responses
}

interface Answer {
  technology: string;           // Technology/solution name
  status: string;              // (Adopt|Assess|Hold|Retire)
  comments: string;            // Additional notes
}

interface StatusOption {
  label: string;               // Status name
  description: string;         // Status meaning
}
```

## 5. Component Specifications

### App.vue Component

#### Tab Navigation
- Three main tabs managed by `v-tabs` and `v-window`:
  - **Questionnaire**: Main data entry interface
  - **Summary**: Technology Radar visualization
  - **Configuration**: Category and entry editor

#### Auto-Save with localStorage
- **Storage Key**: `solution-inventory-data`
- **Storage Version**: 1
- **Saved Data Structure**:
  ```javascript
  {
    version: 1,
    timestamp: "ISO 8601 string",
    categories: [...]
  }
  ```
- **Auto-save**: Triggered on any category change (deep watch)
- **Auto-load**: Loads saved data on component mount
- **Last Saved Indicator**: Shows timestamp in format "HH:MM"

#### Global Actions
- **Save JSON**: Exports categories to downloadable JSON file
- **Load JSON**: Import JSON file from file system
- **Load Sample**: Loads sample data from `data/sample_export.json`
- **Clear Storage**: Removes all data from localStorage (with confirmation)

#### Import Format Support
- Array format: `[{category}, {category}, ...]`
- Object format: `{categories: [{category}, ...]}`

### Questionnaire.vue Component

#### Template Structure
- **Left Panel (v-col md="4")**
  - Category list with active highlighting
  - Click handler: `selectCategory(id)`

- **Right Panel (v-col md="8")**
  - Card header with category title and description
  - Conditional rendering:
    - `v-if="currentCategory.isMetadata"`: Metadata form with text fields and textarea
    - `v-else`: Regular entries with answers section
  - Answer list for each entry:
    - Technology input field (v-text-field)
    - Status select (v-select with tooltips)
    - Comments textarea (v-textarea with auto-grow)
    - Delete button (visible if multiple answers)
  - Add Answer button (v-btn)
  - Navigation buttons (Back/Next) with state-based disabling

#### Reactive State
```javascript
const categories = ref(getCategoriesData())
const activeCategory = ref(categories.value[0].id)
const currentCategory = computed(() => 
  categories.value.find(c => c.id === activeCategory.value)
)
const hasNext = computed(() => /* ... */)
const hasPrev = computed(() => /* ... */)
```

#### Methods
- `selectCategory(id)`: Set active category and scroll to top
- `nextCategory()`: Navigate to next category
- `prevCategory()`: Navigate to previous category
- `getStatusTooltip(status)`: Return tooltip description for status
- `addAnswer(entryId)`: Add new answer to entry
- `deleteAnswer(entryId, answerIdx)`: Remove answer from entry
- `findEntry(entryId)`: Helper to locate entry by ID (includes null-check for entries property)
- `exportJSON()`: Export data as downloadable JSON file (with categories wrapper object)
- `importJSON(data)`: Import data from JSON array

### Summary.vue Component

#### Technology Radar Visualization
- **SVG-based**: 800x800px viewBox for scalable rendering
- **Concentric Rings**: Four status levels
  - Adopt (innermost, radius 120px, green #43A047)
  - Assess (radius 200px, blue #1976D2)
  - Hold (radius 280px, orange #F57C00)
  - Retire (outermost, radius 360px, red #D32F2F)
- **Radial Segments**: 8 segments dividing the radar
- **Technology Bubbles**: Circle radius 20px with abbreviated labels (4 chars)
- **Positioning**: Technologies positioned by status ring and category segment with random offset
- **Interactive Tooltip**: Shows full technology details on hover

#### Computed Properties
- `metadata`: Extracts metadata from metadata category
- `allTechnologies`: Flattens all technologies from all categories with positioning data
- `segmentAngles`: Calculates 8 radial segment angles

#### Methods
- `getStatusColor(status)`: Returns color for status (for SVG)
- `getStatusColorHex(status)`: Returns hex color for legend

### QuestionnaireConfig.vue Component

#### Layout
- **Left Panel (3 columns)**: Category list with add button
- **Right Panel (9 columns)**: Selected category editor

#### Category Management
- **Add Category**: Creates new category with default structure
- **Edit Category**: 
  - Title (auto-generates ID)
  - Description
  - Is Metadata checkbox
- **Delete Category**: Removes category (with confirmation for non-empty)

#### Entry Management (for non-metadata categories)
- **Add Entry**: Creates new entry with default answer
- **Edit Entry**:
  - Aspect (auto-generates ID)
  - Examples text
- **Delete Entry**: Removes entry from category

#### ID Generation
- Converts titles to lowercase with hyphens
- `titleToId(title)`: Utility function for consistent ID creation

#### Methods
- `selectCategory(index)`: Set active category for editing
- `addCategory()`: Add new category to list
- `deleteCategory(index)`: Remove category with confirmation
- `updateCategoryId()`: Auto-update category ID from title
- `addEntry()`: Add new entry to current category
- `deleteEntry(index)`: Remove entry from current category
- `updateEntryId(index)`: Auto-update entry ID from aspect
- `emitUpdate()`: Emit changes to parent component

## 6. UI/UX Specifications

### Layout
- Responsive grid layout (12-column)
- Sidebar + main content pattern
- Mobile optimized (md breakpoint at 960px)

### Vuetify Components Used
- v-app, v-app-bar, v-main: Application shell
- v-toolbar-title: App bar title
- v-tabs, v-tab: Tab navigation
- v-window, v-window-item: Tab content panels
- v-chip: Last saved indicator
- v-container: Main content wrapper
- v-row, v-col: Layout grid
- v-list, v-list-item, v-list-item-content, v-list-item-title, v-list-item-subtitle: Category sidebar
- v-card, v-card-title, v-card-subtitle, v-card-text, v-card-actions: Content container
- v-sheet: Answer grouping with elevation
- v-text-field: Input for technology and metadata
- v-textarea: Multi-line comments input (auto-growing)
- v-select: Status selection with items
- v-btn: Various action buttons
- v-tooltip: Status descriptions
- v-spacer: Navigation button spacing
- v-icon: Icon display
- v-checkbox: Metadata category toggle
- v-divider: Section separator

### CSS Classes
- `.d-flex`: Flexbox display
- `.justify-space-between`: Space-between alignment
- `.align-start`, `.align-center`: Vertical alignment
- `.flex-grow-1`: Growth factor
- `.text-h6`, `.text--secondary`: Typography
- `.pa-3`, `.px-4`, `.mt-4`, `.mb-6`: Padding/margin utilities
- `.border-l-4`, `.border-info`: Left border styling

## 7. Export Specifications

### JSON Export Format
- Object structure with categories property:
  ```json
  {
    "categories": [
      {...},
      {...}
    ]
  }
  ```
- Preserves all metadata, entries, and answers
- Human-readable with 2-space indentation
- File naming: `solution_inventory.json`

### Import Format Support
- Accepts array format: `[{category}, ...]`
- Accepts object format: `{categories: [...]}`
- Validates format before import

### localStorage Format
- Key: `solution-inventory-data`
- Includes version, timestamp, and categories
- Auto-saves on any data change
- Auto-loads on application start

## 8. Build & Deployment

### Build Process
```bash
npm run dev          # Development server with HMR
npm run build        # Production build (minified, optimized)
npm run preview      # Preview production build locally
npm run test-export  # Test Excel export functionality (Node.js script)
```

### Output
- **Dev**: Served from vite dev server (typically http://localhost:5173)
- **Build**: Static files in `dist/` directory
- **PWA**: Service worker and manifest auto-generated by vite-plugin-pwa

### Environment Support
- Node.js 14+
- npm or yarn package manager
- Modern browsers (ES2020+)

## 9. Persistence & State Management

### localStorage Integration
- **Storage Key**: `solution-inventory-data`
- **Version Control**: Version 1 format
- **Auto-save**: Deep watch on categories array triggers save
- **Auto-load**: Data loaded on mount if available
- **Clear Function**: User-triggered with confirmation dialog

### Data Flow
```
User Input → Component State → App.vue categories
           ↓                     ↓
      Auto-save              localStorage
```

### Sample Data
- Loaded from `data/sample_export.json`
- Provides quick start with example data
- Can be loaded via toolbar button

## 10. Error Handling

### Known Issues Fixed
1. **Add Answer Button**: Fixed null reference error in `findEntry()` when categories without entries property were processed
2. **Import Format**: Now supports both array and object formats

### Error Handling Patterns
- Console logging for debugging (findEntry, addAnswer, localStorage operations)
- Null/undefined checks before array operations
- Validation in import function (checks for array or object with categories)
- Length checks for delete operations (prevent deleting last answer)
- Try-catch blocks for localStorage operations
- User-friendly error messages for file import failures
- Confirmation dialogs for destructive operations (delete category, clear storage)

## 11. Performance Considerations

- Vue 3 Composition API for better tree-shaking and code splitting
- Vite's native ES modules for faster development
- Lazy category switching (computed property)
- Progressive rendering with v-for keys
- localStorage for instant persistence without network calls
- SVG-based radar for scalable, performant visualization
- Deep watch optimization with debouncing for auto-save

## 12. Visualization Features

### Technology Radar
- **Inspiration**: ThoughtWorks Technology Radar
- **Implementation**: Native SVG (no external chart libraries)
- **Interactivity**: Hover tooltips without additional dependencies
- **Layout Algorithm**:
  - Status determines ring position (inner to outer)
  - Category determines segment (8 segments, 45° each)
  - Random offset prevents overlapping
- **Responsive**: Scales with viewBox
- **Accessibility**: Includes text labels and tooltips

## 13. Configuration Features

### Dynamic Category Management
- Runtime addition/removal of categories
- No code changes required
- Metadata vs. regular category types
- Automatic ID generation from titles

### Dynamic Entry Management
- Add/remove question aspects
- Edit examples and descriptions
- Maintain answer structure consistency

## 14. Future Technical Considerations

- Backend API integration point (currently all in-memory)
- Database persistence (MongoDB, PostgreSQL, etc.)
- User authentication and authorization
- Real-time collaboration features
- WebSocket support for sync
- Electron wrapper for desktop distribution
