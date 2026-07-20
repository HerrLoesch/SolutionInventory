// Builds a self-contained "authoring package" that a user can hand to an AI so
// it produces a conformant Catalog (Fragenkatalog) JSON. This is the input side of the
// AI-assisted catalog workflow (import + validation live in
// services/catalogImport.js and components/catalog/CatalogImportDialog.vue).
//
// The package deliberately bundles three things, because a bare JSON Schema
// alone under-specifies what a *good* catalog looks like:
//   1. plain-language authoring rules (the constraints validateCatalog enforces,
//      spelled out so the AI does not have to reverse-engineer them),
//   2. the machine-readable JSON Schema (catalog.schema.json), and
//   3. a small, fully-worked EXAMPLE_CATALOG that is guaranteed valid.
//
// EXAMPLE_CATALOG is guarded by catalogAiSchema.spec.js against validateCatalog,
// so it can never silently drift out of conformance.

import schema from './catalog.schema.json'

/**
 * A minimal but complete, schema-valid catalog used as the worked example in
 * the authoring package. One metadata category (with a small metadataOptions
 * vocabulary an entry's appliesTo references) plus two question categories that
 * show typed practice/tool examples. Kept intentionally short so it reads as a
 * template, not as content to copy verbatim.
 */
export const EXAMPLE_CATALOG = {
  id: 'catalog-example',
  name: 'Example Question Catalog',
  description: 'A short, valid catalog illustrating the required structure. Replace its content with your own.',
  version: 1,
  schemaVersion: 1,
  statusOptions: [
    { label: 'Adopt', description: 'We use this and recommend it.' },
    { label: 'Trial', description: 'We are trialing this in selected scenarios.' },
    { label: 'Assess', description: 'We are currently evaluating this.' },
    { label: 'Hold', description: 'We use this but do not recommend it for new work.' }
  ],
  applicabilityOptions: ['applicable', 'not applicable', 'unknown'],
  categories: [
    {
      id: 'context',
      title: 'System Context',
      desc: 'Identity and shape of the system. Drives which later questions apply.',
      isMetadata: true,
      metadata: {
        productName: '',
        company: '',
        description: '',
        executionType: ''
      },
      metadataOptions: {
        executionType: [
          { label: 'Not specified', description: 'Not yet determined. All questions are shown.' },
          { label: 'Web Application', description: 'Runs in a web browser (SPA or thin client).' },
          { label: 'Headless Service / API', description: 'Backend providing interfaces or data, no GUI.' }
        ]
      }
    },
    {
      id: 'architecture',
      title: 'Architecture',
      desc: 'How the system is structured.',
      entries: [
        {
          id: 'arch-style',
          aspect: 'Architectural Style',
          description: 'How is the system decomposed and deployed?',
          examples: [
            {
              type: 'practice',
              label: 'Modular Monolith',
              description: 'One deployable, clear internal module boundaries.'
            },
            { type: 'practice', label: 'Microservices', description: 'Independently deployable domain services.' }
          ]
        },
        {
          id: 'arch-api',
          aspect: 'API Style',
          description: 'How do clients talk to the backend?',
          appliesTo: { executionType: ['Web Application', 'Headless Service / API'] },
          examples: [
            { type: 'practice', label: 'REST', description: 'Resource-oriented HTTP API.' },
            { type: 'tool', label: 'OpenAPI', description: 'Contract-first API description.' }
          ]
        }
      ]
    },
    {
      id: 'delivery',
      title: 'Delivery & Operations',
      desc: 'How the system is built, shipped and run.',
      entries: [
        {
          id: 'del-ci',
          aspect: 'Continuous Integration',
          description: 'How are changes built and verified automatically?',
          examples: [
            {
              type: 'practice',
              label: 'Trunk-Based Development',
              description: 'Frequent small merges to a shared main branch.'
            },
            { type: 'tool', label: 'GitHub Actions', description: 'CI/CD pipelines defined in the repository.' }
          ]
        }
      ]
    }
  ]
}

const AUTHORING_RULES = `## Your task

Produce a **single JSON object** that is a valid Question Catalog (Fragenkatalog) for the Solution Inventory app. Reply with **only** the JSON, with no Markdown fences and no commentary before or after.

## Structure rules (these are enforced on import; violating them blocks the import)

- Top level requires: \`id\`, \`name\`, \`version\` (integer ≥ 1), \`schemaVersion\` (integer ≥ 1, use \`1\`), and a non-empty \`categories\` array.
- There must be **exactly one** category with \`"isMetadata": true\`. It describes the system under assessment and typically has no \`entries\`; instead it may declare \`metadata\` (field keys) and \`metadataOptions\` (allowed values per field).
- Every **category** needs an \`id\` matching \`^[a-z0-9-]+$\` (lowercase letters, digits, hyphens) and a non-empty \`title\`. Category ids must be unique.
- Every non-metadata category needs an \`entries\` array. Each **entry** needs a non-empty \`id\` (unique within its category) and a non-empty \`aspect\` (the question/topic). \`description\` is optional guidance.
- **Examples** (optional, per entry) each need a \`label\` and should carry a \`type\` of either \`"practice"\` (a pattern/method) or \`"tool"\` (a concrete technology).
- \`appliesTo\` (optional, on a category or entry) conditions visibility on a metadata field, e.g. \`{ "executionType": ["Web Application"] }\`. Every field and value it references should exist in the metadata category's \`metadataOptions\`.

## Guidance for a good catalog

- Order categories as a natural conversation (context → domain → architecture → stack → delivery → operations).
- Keep aspects high-signal; prefer fewer, meaningful questions over many trivial ones.
- Separate Practices (patterns) from Tools (technologies) via the \`type\` field. This lets the app roll them up into reference architectures vs. toolchains.
- Phrase entry \`description\` as interviewer guidance ("what to probe / why it matters").
- Write plainly. Avoid em-dashes (—) and other stylistic tells; use ordinary punctuation such as periods, commas and colons.`

/**
 * Assembles the full Markdown authoring package (rules + JSON Schema + worked
 * example) to copy or download and hand to an AI. Pure, so it is safe to call anywhere.
 * @returns {string} Markdown document.
 */
export function buildCatalogAuthoringPackage() {
  return [
    '# Question Catalog authoring guide',
    '',
    'Use this to generate a Question Catalog for the Solution Inventory app. Read the rules, follow the JSON Schema, and mirror the example structure.',
    '',
    AUTHORING_RULES,
    '',
    '## JSON Schema (draft 2020-12)',
    '',
    '```json',
    JSON.stringify(schema, null, 2),
    '```',
    '',
    '## Worked example (valid catalog)',
    '',
    '```json',
    JSON.stringify(EXAMPLE_CATALOG, null, 2),
    '```',
    ''
  ].join('\n')
}

/**
 * Returns the raw JSON Schema object (a defensive deep clone) for callers that
 * want the schema on its own rather than the full package.
 */
export function getCatalogSchema() {
  return JSON.parse(JSON.stringify(schema))
}
