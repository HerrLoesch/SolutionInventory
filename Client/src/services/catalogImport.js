// Parses and prepares an externally-authored (typically AI-generated) Catalog
// for import — the counterpart to the export in catalogAiSchema.js. Structural
// validation stays in schema/catalogValidation.js (validateCatalog); comparison
// against an existing catalog stays in catalogCompare.js. This module only turns
// raw text/objects into a clean, library-ready catalog.

import { createId } from '../stores/workspaceFactories'
import { createBlankCatalog, migrateCategoriesExamplesToTyped } from './catalogService'

/**
 * Parses import text into a catalog object. Accepts either a bare catalog
 * object or a `{ catalog: {...} }` wrapper (some tools nest it). Throws with a
 * human-readable message the import dialog can surface directly.
 * @param {string} text
 * @returns {object} the parsed catalog object (not yet prepared/validated)
 */
export function parseCatalogImport(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) {
    throw new Error('No content to import — paste catalog JSON or choose a file.')
  }
  let data
  try {
    data = JSON.parse(trimmed)
  } catch (err) {
    throw new Error(`Not valid JSON: ${err.message}`)
  }
  const catalog = data && typeof data === 'object' && !Array.isArray(data) && data.catalog ? data.catalog : data
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error('Expected a catalog object at the top level.')
  }
  return catalog
}

/**
 * Turns a raw imported catalog into one that is safe to add to the library:
 * a deep clone with a fresh id (never reuse the source's, to avoid colliding
 * with a library catalog), sensible defaults filled in for fields an AI may
 * omit, and examples normalized to the typed practice/tool shape.
 *
 * Does NOT validate — callers run validateCatalog separately so schema errors
 * can gate the import while still importing a best-effort object for preview.
 *
 * @param {object} rawCatalog parsed catalog (see parseCatalogImport)
 * @param {object} categoriesData built-in question set, for default vocab
 * @returns {object} a new, library-ready catalog object
 */
export function prepareImportedCatalog(rawCatalog, categoriesData) {
  const source = JSON.parse(JSON.stringify(rawCatalog || {}))
  const defaults = createBlankCatalog('', categoriesData)

  const prepared = {
    ...source,
    id: createId('catalog'),
    name: String(source.name || '').trim() || 'Imported catalog',
    description: typeof source.description === 'string' ? source.description : '',
    version: Number.isInteger(source.version) && source.version >= 1 ? source.version : 1,
    schemaVersion:
      Number.isInteger(source.schemaVersion) && source.schemaVersion >= 1
        ? source.schemaVersion
        : defaults.schemaVersion,
    statusOptions:
      Array.isArray(source.statusOptions) && source.statusOptions.length
        ? source.statusOptions
        : defaults.statusOptions,
    applicabilityOptions:
      Array.isArray(source.applicabilityOptions) && source.applicabilityOptions.length
        ? source.applicabilityOptions
        : defaults.applicabilityOptions,
    categories: Array.isArray(source.categories) ? source.categories : []
  }

  // Normalize any legacy/untyped examples to the typed shape in place, matching
  // how a catalog is upgraded when opened in the editor.
  migrateCategoriesExamplesToTyped(prepared.categories)

  return prepared
}
