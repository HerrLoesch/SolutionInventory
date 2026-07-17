// Catalog (Fragenkatalog) template handling — see docs/spec-fragenkataloge.md §3.
// A Catalog is a reusable template (structure only, no answers); a
// Questionnaire is an instance of a Catalog with answers filled in.

import { createQuestionnaire } from '../stores/workspaceFactories'
import { normalizeCategories } from '../stores/normalizeCategories'

const STANDARD_CATALOG_ID = 'catalog-standard'

/**
 * Strips instance-only fields (answers, applicability, entryComment) from a
 * deep clone of `categories`, turning a filled-in questionnaire's categories
 * back into a catalog template shape.
 */
export function stripAnswersFromCategories(categories) {
  const clone = JSON.parse(JSON.stringify(categories || []))
  clone.forEach((category) => {
    if (!Array.isArray(category.entries)) return
    category.entries.forEach((entry) => {
      delete entry.answers
      delete entry.applicability
      delete entry.entryComment
    })
  })
  return clone
}

/**
 * Builds the catalog that ships with the app, seeded from the built-in
 * question set in categoriesService.js. Used both to seed a brand-new
 * workspace and to migrate existing v1 workspaces to v2 (§3.3.2).
 */
export function buildStandardCatalogFromSeed(categoriesData) {
  return {
    id: STANDARD_CATALOG_ID,
    name: 'Standard Catalog',
    description: 'Default catalog seeded from the built-in question set.',
    version: 1,
    schemaVersion: 1,
    statusOptions: categoriesData.statusOptions,
    applicabilityOptions: ['applicable', 'not applicable', 'unknown'],
    categories: stripAnswersFromCategories(categoriesData.categories)
  }
}

/**
 * Instantiates a Catalog into a new Questionnaire: a deep copy of the
 * catalog's structure with instance-only fields (answers, applicability)
 * filled in with defaults, tagged with its catalog provenance.
 */
export function instantiateCatalog(catalog, name) {
  const questionnaire = createQuestionnaire(name, normalizeCategories(catalog.categories))
  questionnaire.catalogId = catalog.id
  questionnaire.catalogVersion = catalog.version
  return questionnaire
}
