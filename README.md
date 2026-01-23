# Solution Inventory PWA

A Progressive Web App built with Vue 3 and Vuetify for comprehensive solution/product assessment questionnaires. Features workflow-based category navigation, multiple answer support per aspect, and flexible data export/import capabilities.

## Features

- **Interactive Questionnaire**: Navigate through 7 main categories (Solution Description, Architecture, Front-End, Back-End, Ops & Security, Infrastructure & Data, Hardware & IO, QA & Testing)
- **Multiple Answers**: Add/remove multiple technology/solution entries per aspect
- **Technology Radar Status**: Track adoption status (Adopt, Assess, Hold, Retire) for each entry
- **Export Options**:
  - Excel (.xlsx) with flattened data structure
  - JSON for complete data roundtrip (save/import)
- **Responsive Design**: Mobile-friendly layout with Vuetify Material Design components
- **PWA Support**: Installable as standalone app with offline capability

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens local dev server (typically http://localhost:5173).

### Production Build

```bash
npm run build
```

Creates optimized build in `dist/` directory.

### Preview Build

```bash
npm run preview
```

Serves the production build locally for testing.

## Project Structure

```
src/
├── main.js                  # Vue app initialization with Vuetify
├── App.vue                  # Root component with app-bar and controls
├── components/
│   └── Questionnaire.vue    # Main questionnaire component
├── services/
│   └── categoriesService.js # Category definitions and data structure
└── utils/
    └── exportExcel.js       # Excel export utility using SheetJS

public/
├── pwa-192.png             # PWA icon (192x192, replace with real image)
└── pwa-512.png             # PWA icon (512x512, replace with real image)
```

## Data Model

Each category contains multiple entries (aspects/questions), and each entry supports multiple answers:

```javascript
{
  id: 'category-id',
  title: 'Category Title',
  desc: 'Description',
  entries: [
    {
      id: 'entry-id',
      aspect: 'Question / Aspect',
      examples: 'Example options',
      answers: [
        { technology: 'Tech Name', status: 'Adopt', comments: 'Notes' }
      ]
    }
  ]
}
```

Special metadata category (Solution Description) uses different structure:

```javascript
{
  id: 'solution-desc',
  title: 'Solution Description',
  isMetadata: true,
  metadata: {
    productName: '',
    company: '',
    department: '',
    contactPerson: '',
    description: ''
  }
}
```

## Export/Import

### JSON Export
Exports complete category structure including all metadata and answers. Preserves all data for later import.

```bash
Click "Save JSON" button in app-bar
```

### JSON Import
Restores previously saved questionnaire state.

```bash
Click "Load JSON" button and select a JSON file
```

### Excel Export
Flattens data structure into rows suitable for analysis/reporting. Includes:
- All metadata fields (Product, Company, Department, Contact, Description)
- All category entries with multiple answers as separate rows
- Technology, Status, and Comments columns

```bash
Click "Excel Export" button in app-bar
```

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages on every push to main branch.

### Setup

1. Enable GitHub Pages in repository settings:
   - Settings → Pages → Source: GitHub Actions
   - Ensure repository is public (or use GitHub Pro)

2. Workflow file: `.github/workflows/build-and-deploy.yml`
   - Runs on push to main branch
   - Builds with `npm run build`
   - Deploys dist/ to GitHub Pages
   - Accessible at: `https://username.github.io/SolutionInventory/`

### Manual Deployment (if needed)

```bash
npm run build
# dist/ folder is ready for GitHub Pages
```

## Dependencies

- **Vue 3**: UI framework
- **Vuetify 3**: Material Design components
- **Vite 4**: Build tool and dev server
- **SheetJS (xlsx)**: Excel file generation
- **vite-plugin-pwa**: PWA manifest and service worker generation

## Browser Support

Works on all modern browsers (Chrome, Firefox, Safari, Edge) with:
- ES2020+ JavaScript support
- CSS Grid/Flexbox
- IndexedDB (for PWA offline)

## Notes

- Replace placeholder icons (`public/pwa-192.png`, `public/pwa-512.png`) with actual product icons
- The `base` URL in `vite.config.js` is set to `/SolutionInventory/` for GitHub Pages compatibility
- Service worker is auto-updated; offline functionality works once app is installed