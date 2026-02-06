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
│          Utility Layer              │
│  (exportExcel, exportExcelNode)     │
└─────────────────────────────────────┘
```

## 2. Technology Stack Details

### Frontend Dependencies
```json
{
  "vue": "^3.3.4",           // Progressive JavaScript framework
  "vuetify": "^3.3.0",       // Material Design component library
  "xlsx": "^0.18.5"          // Excel file generation and parsing
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
- **src/App.vue**: Root Vue component, component wrapper
- **src/main.js**: Application entry point, Vue instance creation, Vuetify initialization
- **src/components/Questionnaire.vue**: Main UI component (328 lines)
  - Manages category selection
  - Renders questionnaire entries
  - Handles answer input/edit/delete operations
  - Provides export/import functionality

### Services
- **src/services/categoriesService.js** (427 lines)
  - Exports `getCategoriesData()` function
  - Returns complete category data structure
  - Categories covered:
    - Solution Description (metadata)
    - Architecture (8 aspects)
    - Front-End (TBD from service)
    - Back-End (TBD from service)
    - Data & Persistence (TBD from service)
    - Development & Quality (TBD from service)
    - Infrastructure (TBD from service)

### Utilities
- **src/utils/exportExcel.js**: Browser-based XLSX export
  - Function: `exportToExcel(data, filename)`
  - Uses XLSX library for client-side generation
  
- **src/utils/exportExcelNode.js**: Node.js server-side export
  - Used in test script: `scripts/test_export_node.js`
  - Supports command-line export functionality

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
- `exportXLSX()`: Export data to Excel format with headers
- `exportJSON()`: Export data as downloadable JSON file
- `importJSON(data)`: Import data from JSON array

## 6. UI/UX Specifications

### Layout
- Responsive grid layout (12-column)
- Sidebar + main content pattern
- Mobile optimized (md breakpoint at 960px)

### Vuetify Components Used
- v-row, v-col: Layout grid
- v-list, v-list-item: Category sidebar
- v-card, v-card-title, v-card-subtitle, v-card-text, v-card-actions: Content container
- v-sheet: Answer grouping with elevation
- v-text-field: Input for technology and metadata
- v-textarea: Multi-line comments input (auto-growing)
- v-select: Status selection with items
- v-btn: Various action buttons
- v-tooltip: Status descriptions
- v-spacer: Navigation button spacing

### CSS Classes
- `.d-flex`: Flexbox display
- `.justify-space-between`: Space-between alignment
- `.align-start`, `.align-center`: Vertical alignment
- `.flex-grow-1`: Growth factor
- `.text-h6`, `.text--secondary`: Typography
- `.pa-3`, `.px-4`, `.mt-4`, `.mb-6`: Padding/margin utilities
- `.border-l-4`, `.border-info`: Left border styling

## 7. Export Specifications

### Excel Export Format
Columns:
- Category (category title)
- Question / Aspect (entry aspect)
- Examples & Options (entry examples)
- Technology Used (answer technology)
- Status (answer status)
- Comments / Notes (answer comments)

Rows structure:
1. Metadata entries from Solution Description category
2. Regular category entries with multiple rows per entry if multiple answers exist

File naming: `solution_inventory.xlsx`

### JSON Export Format
- Complete categories array structure
- Preserves all metadata and entries
- Human-readable with 2-space indentation
- File naming: `solution_inventory.json`

## 8. Build & Deployment

### Build Process
```bash
npm run dev      # Development server with HMR
npm run build    # Production build (minified, optimized)
npm run preview  # Preview production build locally
```

### Output
- **Dev**: Served from vite dev server (typically http://localhost:5173)
- **Build**: Static files in `dist/` directory
- **PWA**: Service worker and manifest auto-generated by vite-plugin-pwa

### Environment Support
- Node.js 14+
- npm or yarn package manager
- Modern browsers (ES2020+)

## 9. Error Handling

### Known Issues Fixed
1. **Add Answer Button**: Fixed null reference error in `findEntry()` when categories without entries property were processed

### Error Handling Patterns
- Console logging for debugging (findEntry, addAnswer)
- Null/undefined checks before array operations
- Validation in import function (checks for array)
- Length checks for delete operations (prevent deleting last answer)

## 10. Performance Considerations

- Vue 3 Composition API for better tree-shaking and code splitting
- Vite's native ES modules for faster development
- Lazy category switching (computed property)
- Progressive rendering with v-for keys

## 11. Testing

### Manual Testing
- `npm run test-export`: Tests Excel export with sample data
- Sample test data: `data/sample_export.json`
- Test script: `scripts/test_export_node.js`

## 12. Future Technical Considerations

- Backend API integration point (currently all in-memory)
- Database persistence (MongoDB, PostgreSQL, etc.)
- User authentication and authorization
- Real-time collaboration features
- WebSocket support for sync
- Electron wrapper for desktop distribution
