# AI Context for Solution Inventory PWA

## Project Overview
**Solution Inventory PWA** is a progressive web application built with Vue 3 and Vite that helps organizations document and track technology solutions, architectural decisions, and software components used across their systems.

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
- **Build Tool**: Vite
- **UI Library**: Vuetify 3.3.0
- **Runtime**: Node.js with npm
- **Styling**: Scoped CSS in Vue components
- **State Management**: Vue 3 reactive refs and computed properties
- **Export**: XLSX format (Excel files) and JSON

## Project Structure
```
/src
  ├── main.js                    # Application entry point
  ├── App.vue                    # Root component
  ├── components/
  │   └── Questionnaire.vue      # Main UI component for questionnaire
  ├── services/
  │   └── categoriesService.js   # Category data and structure
  └── utils/
      ├── exportExcel.js         # Browser-based Excel export
      └── exportExcelNode.js     # Node.js server-side Excel export
/public                          # Static assets
/data
  └── sample_export.json        # Sample data for testing
```

## Key Features
1. **Category-based Navigation**: Left sidebar shows categories, main area shows content
2. **Question/Answer Format**: Each category contains multiple aspects with answer fields
3. **Status Tracking**: Answers can be marked with: Adopt, Assess, Hold, Retire
4. **Multiple Answers**: Users can add multiple technology answers per aspect
5. **Export Functionality**: Export collected data to Excel or JSON formats
6. **Import Functionality**: Import previously saved JSON data
7. **PWA Support**: Progressive web app capabilities via Vite PWA plugin

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
- **App.vue** (root)
  - **Questionnaire.vue** (main questionnaire interface)
    - Category list (v-list with v-list-items)
    - Category card with entries
    - Answer input section
    - Export/Import buttons

## Known Issues & Fixes
- **Add Answer Button Issue**: Fixed by adding null-check for `cat.entries` in `findEntry()` function (some categories like metadata don't have entries)

## Development Commands
- `npm run dev` - Start development server with Vite hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test-export` - Test Excel export with sample data

## Code Patterns
- **Reactive State**: Using `ref()` for mutable state
- **Computed Properties**: Using `computed()` for derived data
- **Template Directives**: v-for, v-if, v-model, @click, :key
- **Vuetify Components**: v-row, v-col, v-card, v-btn, v-text-field, v-textarea, v-select, v-list, v-sheet

## Environment & Browser Compatibility
- Runs on Node.js 14+ environments
- Target browsers: Modern browsers with ES2020+ support
- PWA-capable browsers (service worker support)

## Import Paths Convention
- Relative imports for components and utilities
- Absolute-style imports for services

## Future Enhancement Areas
- Database persistence (currently in-memory only)
- User authentication
- Multi-user collaboration features
- Real-time sync across devices
- Advanced filtering and search
- Custom category creation
