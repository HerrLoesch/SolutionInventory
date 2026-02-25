# Product Requirements Document - Solution Inventory PWA

## 1. Executive Summary
Solution Inventory PWA is a Vue-based application for documenting solution questionnaires across multiple projects. It provides a project tree, questionnaire tabs, a cross-questionnaire comparison view, and a configuration editor. Data is stored locally and can be imported/exported per project.

## 2. Product Vision

### 2.1 Purpose
Create a centralized, accessible platform to:
- Maintain an accurate inventory of technologies in use
- Document architectural decisions and rationale
- Track lifecycle status (Adopt, Assess, Hold, Retire)
- Compare technology choices across questionnaires within a project
- Share project documentation via JSON export/import

### 2.2 Target Users
- Technology architects and decision makers
- Solution engineers
- IT department staff
- Technical team leads

### 2.3 Key Benefits
- Structured documentation via guided questions
- Simple project organization with drag-and-drop reordering
- Cross-questionnaire deviation analysis with configurable rules
- Local persistence with JSON export/import

## 3. Feature Requirements

### 3.1 Core Features

#### 3.1.1 Projects and Questionnaires
- Project tree for navigation and management
- Context menus for create, rename, delete
- Drag-and-drop questionnaires between projects
- Drag-and-drop reordering of questionnaires within a project (order persisted in JSON)
- Questionnaire tabs with close buttons
- Project Summary tab opened by clicking a project node

#### 3.1.2 Questionnaire Editing
- Category navigation within a questionnaire
- Multiple answers per aspect with technology, status, and comments
- Status and applicability selects with descriptions
- Entry-level general comment field
- Metadata fields: productName, company, department, contactPerson, description, executionType, architecturalRole
- "Not specified" option in executionType / architecturalRole — acts as a wildcard, all questions shown
- **Reference questionnaire toggle** in metadata section: marks this questionnaire as the reference for project comparison

#### 3.1.3 Configuration Editor
- Configuration editor in a dialog
- Add/edit/delete categories and entries
- Examples list supports objects with label + description

#### 3.1.4 Data Management
- Auto-save to localStorage
- Project export to JSON (includes questionnaireIds order, deviationSettings, referenceQuestionnaireId)
- Project import from JSON (validated in dialog)
- Sample data loader in app bar

#### 3.1.5 Project Summary View
- Accessible by clicking a project node in the tree
- Displays a cross-questionnaire matrix: aspects (rows) × questionnaires (columns)
- Categories displayed in collapsible accordion sections
- Colored status chips per cell (Adopt / Assess / Hold / Retire)
- Comment tooltips on chip hover
- Search filter across aspects and technologies
- Alphabetically sorted aspects
- **Settings gear button** before the search bar opens the CategorySettings dialog
- **Deviation violations** highlighted: red exclamation icon in category header and on the subcategory row when a rule is violated

#### 3.1.6 Category Deviation Settings
- Per-project settings for which categories/aspects must not deviate
- Checkbox tree in a dialog (CategorySettings component)
- Category-level toggle applies to all child entries; entry-level overrides are supported
- Default: deviations allowed (unchecked)

#### 3.1.7 Reference Questionnaire
- One questionnaire per project can be designated as the reference
- When set: other questionnaires are compared against the reference
  - Deviation = answer has different status than reference OR answer not present in reference
  - Subset answers (fewer than reference) are NOT a deviation
- When not set: questionnaires compared pairwise by technology+status

#### 3.1.8 Resizable Sidebar
- Drag handle on the right edge of the navigation drawer
- Width adjustable between 160 px and 640 px
- Width persisted across sessions (localStorage)

## 4. Functional Requirements
- The system shall store data locally in the browser.
- The system shall allow creating projects and questionnaires.
- The system shall allow questionnaire tabs to open and close.
- The system shall support project import/export in JSON format.
- The system shall allow configuration of categories and entries via UI.
- The system shall allow multiple answers per aspect.
- The system shall allow reordering questionnaires within a project via drag-and-drop.
- The system shall persist the questionnaire order in the project JSON.
- The system shall allow configuring deviation rules per project and highlight violations in the summary.
- The system shall be responsive on desktop and tablet.

## 5. Non-Functional Requirements
- Performance: render within 2 seconds for typical datasets.
- Usability: minimal learning curve for non-technical users.
- Maintainability: modular component architecture.
- Reliability: auto-save prevents data loss.

## 6. User Stories

### 6.1 Document Project Technology Stack
As a Technology Architect, I want to document technologies per project so that
we have a standardized record of our solutions.

### 6.2 Manage Questionnaires
As a Solution Engineer, I want to create and open multiple questionnaires so
that I can switch between solutions quickly.

### 6.3 Share Project Documentation
As a Team Lead, I want to export a project as JSON so that I can share it with
other teams.

### 6.4 Import Project Documentation
As a Team Lead, I want to import a project JSON so that I can continue work on
an existing questionnaire.

### 6.5 Customize Questionnaire Structure
As a Team Lead, I want to edit categories and questions so that the questionnaire
fits our organization.

### 6.6 Get a Project Overview
As a Technology Architect, I want to open a project summary so that I can compare
technology choices across all questionnaires in one view.

### 6.7 Enforce Consistency Rules
As a Technology Architect, I want to flag categories where deviations are not allowed
so that violations are immediately visible in the project summary.

### 6.8 Compare Against a Reference
As a Solution Engineer, I want to designate one questionnaire as the reference so that
all other questionnaires are compared against it instead of against each other.

### 6.9 Reorder Questionnaires
As a Team Lead, I want to drag questionnaires into a specific order within a project
so that the export JSON reflects the intended sequence.

## 7. Product Scope

### In Scope
- Project tree with questionnaires
- Questionnaire tabs with close buttons
- Project summary view (cross-questionnaire matrix with deviation highlights)
- Questionnaire editing, metadata, and reference questionnaire toggle
- Category deviation settings per project
- Configuration editor in dialog
- Project import/export
- Auto-save and sample data loading
- Resizable sidebar
- Drag-and-drop move and reorder of questionnaires

### Out of Scope
- Server-side storage or authentication
- Real-time collaboration
- Advanced analytics or reporting

## 8. Success Metrics
- Adoption: 80% of target users complete at least one questionnaire
- Export Usage: 50% of users export a project
- Configuration Usage: 30% of teams customize categories

## 9. Constraints and Assumptions
- Static hosting only
- Modern browsers with ES2020+ support
- Users manage their own exported data
- Users are familiar with questionnaire/form interfaces

## 9. Dependencies

### Technical Dependencies
- Vue 3.3+
- Vuetify 3.3+
- Vite 4.4+
- Pinia 2+
- Playwright (E2E)

### External Dependencies
- Browser localStorage API (minimum 5MB storage)
- Modern browser with ES2020+ support

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data loss on browser crash | Low | High | Auto-save to localStorage |
| localStorage quota exceeded | Low | Medium | Warn users and reduce dataset size |
| Import file corruption | Low | High | Validate JSON and show errors |
| Performance issues with large datasets | Low | Medium | Consider pagination/virtualization |
| Browser incompatibility | Low | Medium | Cross-browser testing, version detection |
| Confusion with multiple tabs | Low | Low | Clear tab labels, intuitive navigation |

## 11. Future Enhancements (Post-MVP)

### Phase 2 Features
- Excel/PDF export formats
- Advanced search and filtering in questionnaire
- Bulk import from external sources (CSV, Excel)
- Undo/redo functionality
- Keyboard shortcuts

### Phase 3 Features
- Backend database for persistent storage
- User authentication and multi-user support
- Revision history and change tracking
- API for integrations
- Advanced analytics dashboard
- Team collaboration features

## 12. Glossary

- **Aspect**: A specific question or topic within a category
- **Category**: A grouped set of related aspects (Architecture, Front-End, etc.)
- **Answer**: A response to an aspect, including technology, status, and comments
- **Entry**: Synonym for aspect
- **Export**: Download application data in external format
- **Import**: Load external data file into application
- **Metadata**: Solution description information (product, company, contact)
- **Status**: Lifecycle classification of a technology (Adopt/Assess/Hold/Retire)
- **localStorage**: Browser storage API for persistent data
- **Tab**: Navigation element for switching between open questionnaires
- **Configuration**: Editor interface for customizing questionnaire structure
- **Deviation**: A difference in technology answers or statuses between questionnaires for the same aspect
- **Reference Questionnaire**: The questionnaire designated as the baseline for comparison within a project
- **Deviation Settings**: Per-project rules that flag specific categories/aspects as requiring consistency
