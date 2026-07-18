// Catalog (Fragenkatalog) template handling — see docs/spec-fragenkataloge.md §3.
// A Catalog is a reusable template (structure only, no answers); a
// Questionnaire is an instance of a Catalog with answers filled in.

import { createId, createQuestionnaire } from '../stores/workspaceFactories'
import { normalizeCategories } from '../stores/normalizeCategories'
import { getInterviewCatalogData } from './interviewCatalogData'

const STANDARD_CATALOG_ID = 'catalog-standard'
const INTERVIEW_CATALOG_ID = 'catalog-interview'

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
 * Builds the additional, interview-optimized catalog shipped alongside the
 * Standard Catalog (see docs/spec-fragenkataloge.md Phase 6). Its seed is
 * already in catalog shape with typed examples (interviewCatalogData.js), so
 * unlike the standard catalog there are no answers to strip. A fresh clone is
 * returned on every call so callers can freely mutate it (e.g. as an editor
 * draft) without touching the module-level seed.
 */
export function buildInterviewCatalog() {
  const seed = getInterviewCatalogData()
  return {
    id: INTERVIEW_CATALOG_ID,
    name: 'Software System Interview',
    description:
      'Interview guide for software systems — separates Practices (patterns) from Tools (technologies) to inform reference architectures and toolchains.',
    version: 1,
    schemaVersion: 1,
    statusOptions: seed.statusOptions,
    applicabilityOptions: seed.applicabilityOptions,
    categories: JSON.parse(JSON.stringify(seed.categories))
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

/**
 * Builds a new, empty-but-valid catalog for the library (§4.1): just the
 * metadata category, cloned from the standard catalog so the
 * executionType/architecturalRole vocabulary used by `appliesTo` elsewhere
 * stays consistent across catalogs.
 */
export function createBlankCatalog(name, categoriesData) {
  const standard = buildStandardCatalogFromSeed(categoriesData)
  const metadataCategory = standard.categories.find((category) => category.isMetadata)
  return {
    id: createId('catalog'),
    name: name || 'New catalog',
    description: '',
    version: 1,
    schemaVersion: standard.schemaVersion,
    statusOptions: JSON.parse(JSON.stringify(standard.statusOptions)),
    applicabilityOptions: [...standard.applicabilityOptions],
    categories: metadataCategory ? [JSON.parse(JSON.stringify(metadataCategory))] : []
  }
}

/**
 * Deep-clones a catalog under a new id/name, reset to version 1 (a
 * duplicate is a new, independent template — not a new version of the source).
 */
export function duplicateCatalogTemplate(catalog, name) {
  return {
    ...JSON.parse(JSON.stringify(catalog)),
    id: createId('catalog'),
    name,
    version: 1
  }
}

/**
 * Expands one example into its typed form(s). An already-typed example
 * ({ type: 'practice' | 'tool', label, description }) passes through
 * unchanged. A legacy example ({ label, description, tools[] }, no `type`)
 * becomes one 'practice' example plus one 'tool' example per entry in
 * `tools[]` — see docs/spec-fragenkataloge.md §3.1. Pure — never mutates
 * its input, so it's safe to use on data at rest (Questionnaire instances,
 * which are never bulk-migrated, only read tolerantly).
 */
export function expandExampleToTyped(example) {
  if (!example || typeof example !== 'object') return []
  if (example.type === 'practice' || example.type === 'tool') return [example]

  const expanded = []
  if (String(example.label || '').trim()) {
    expanded.push({ type: 'practice', label: example.label, description: example.description || '' })
  }
  ;(Array.isArray(example.tools) ? example.tools : []).forEach((tool) => {
    if (tool) expanded.push({ type: 'tool', label: tool, description: '' })
  })
  return expanded
}

export function expandExamplesToTyped(examples) {
  return (Array.isArray(examples) ? examples : []).flatMap(expandExampleToTyped)
}

/**
 * Normalizes every entry's `examples[]` in a categories tree to the typed
 * form, in place. Only ever applied to a catalog **draft** the moment it's
 * opened in the editor (workspaceStore.js openCatalogEditor, before the
 * dirty-watch attaches) — never to data at rest, and never to Questionnaire
 * instances (those stay read-only and rely on expandExamplesToTyped instead).
 * A catalog only converges to the new shape once a user actually saves it.
 */
export function migrateCategoriesExamplesToTyped(categories) {
  ;(categories || []).forEach((category) => {
    ;(category.entries || []).forEach((entry) => {
      if (Array.isArray(entry.examples)) {
        entry.examples = expandExamplesToTyped(entry.examples)
      }
    })
  })
}

/**
 * Counts categories/entries for a compact catalog summary (§4.2 project dialog,
 * §4.1 library list): "6 categories · 34 questions".
 */
export function summarizeCatalog(catalog) {
  const categories = Array.isArray(catalog?.categories) ? catalog.categories : []
  const questionCategories = categories.filter((c) => !c.isMetadata)
  const entryCount = questionCategories.reduce((sum, c) => sum + (Array.isArray(c.entries) ? c.entries.length : 0), 0)
  return { categoryCount: questionCategories.length, entryCount }
}
