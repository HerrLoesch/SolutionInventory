// Runtime validator for the Catalog structure described in
// docs/spec-fragenkataloge.md §3.2 / catalog.schema.json. Hand-written rather
// than a generic JSON-Schema interpreter, since the rule set is small and
// fixed and the project has no schema-validation dependency yet.
//
// Errors are structural problems that must block saving (§4.5): missing
// required fields, duplicate/malformed ids, wrong metadata-category count.
// Warnings are advisory (e.g. appliesTo referencing an unknown metadata
// field/value) and never block saving.

const CATEGORY_ID_PATTERN = /^[a-z0-9-]+$/

function addFinding(list, path, message) {
  list.push({ path, message })
}

function validateExample(example, path, errors) {
  if (!example || typeof example !== 'object') {
    addFinding(errors, path, 'Example must be an object.')
    return
  }
  if (!String(example.label || '').trim()) {
    addFinding(errors, `${path}.label`, 'Example label is required.')
  }
  // `type` is optional for backward compatibility: older catalogs may still
  // have untyped examples with a nested `tools[]` array (pre-Phase-4.1
  // shape) — only an invalid (non-practice/tool) type is an error, a
  // missing one is not.
  if (example.type !== undefined && example.type !== 'practice' && example.type !== 'tool') {
    addFinding(errors, `${path}.type`, 'Example type must be "practice" or "tool" when present.')
  }
  if (example.tools !== undefined) {
    const toolsValid = Array.isArray(example.tools) && example.tools.every((t) => typeof t === 'string')
    if (!toolsValid) {
      addFinding(errors, `${path}.tools`, 'Example tools must be an array of strings.')
    }
  }
}

function validateAppliesTo(appliesTo, path, warnings, knownMetadataFields) {
  if (appliesTo === undefined) return
  if (!appliesTo || typeof appliesTo !== 'object' || Array.isArray(appliesTo)) {
    addFinding(warnings, path, 'appliesTo must be an object of { metadataField: value(s) }.')
    return
  }
  Object.entries(appliesTo).forEach(([field, value]) => {
    const known = knownMetadataFields.get(field)
    if (!known) {
      addFinding(warnings, `${path}.${field}`, `appliesTo references unknown metadata field "${field}".`)
      return
    }
    const values = Array.isArray(value) ? value : [value]
    values.forEach((v) => {
      if (!known.has(v)) {
        addFinding(
          warnings,
          `${path}.${field}`,
          `appliesTo value "${v}" is not one of the declared options for "${field}".`
        )
      }
    })
  })
}

function validateEntry(entry, categoryPath, seenEntryIds, errors, warnings, knownMetadataFields) {
  const path = `${categoryPath}.entries[${entry?.id ?? '?'}]`
  if (!entry || typeof entry !== 'object') {
    addFinding(errors, path, 'Entry must be an object.')
    return
  }
  if (!String(entry.id || '').trim()) {
    addFinding(errors, path, 'Entry id is required.')
  } else if (seenEntryIds.has(entry.id)) {
    addFinding(errors, path, `Duplicate entry id "${entry.id}" within category.`)
  } else {
    seenEntryIds.add(entry.id)
  }
  if (!String(entry.aspect || '').trim()) {
    addFinding(errors, path, 'Entry aspect is required.')
  }
  ;(entry.examples || []).forEach((example, idx) => {
    validateExample(example, `${path}.examples[${idx}]`, errors)
  })
  validateAppliesTo(entry.appliesTo, `${path}.appliesTo`, warnings, knownMetadataFields)
}

function validateCategory(category, seenCategoryIds, errors, warnings, knownMetadataFields) {
  const path = `categories[${category?.id ?? '?'}]`
  if (!category || typeof category !== 'object') {
    addFinding(errors, path, 'Category must be an object.')
    return
  }
  if (!String(category.id || '').trim()) {
    addFinding(errors, path, 'Category id is required.')
  } else {
    if (seenCategoryIds.has(category.id)) {
      addFinding(errors, path, `Duplicate category id "${category.id}".`)
    }
    seenCategoryIds.add(category.id)
    if (!CATEGORY_ID_PATTERN.test(category.id)) {
      addFinding(errors, path, `Category id "${category.id}" must match ^[a-z0-9-]+$.`)
    }
  }
  if (!String(category.title || '').trim()) {
    addFinding(errors, path, 'Category title is required.')
  }

  if (!category.isMetadata) {
    if (!Array.isArray(category.entries)) {
      addFinding(errors, path, 'Non-metadata category must have an entries array.')
    } else if (category.entries.length === 0) {
      addFinding(warnings, path, 'Category has no entries yet.')
    } else {
      const seenEntryIds = new Set()
      category.entries.forEach((entry) =>
        validateEntry(entry, path, seenEntryIds, errors, warnings, knownMetadataFields)
      )
    }
  }

  validateAppliesTo(category.appliesTo, `${path}.appliesTo`, warnings, knownMetadataFields)
}

/**
 * Collects { fieldName: Set(validLabels) } from the metadata category's
 * metadataOptions, so appliesTo references can be checked against them.
 * Fields without declared options are left unchecked (they may be free text).
 */
function collectKnownMetadataFields(metadataCategory) {
  const fields = new Map()
  const options = metadataCategory?.metadataOptions || {}
  Object.entries(options).forEach(([field, values]) => {
    const labels = new Set((Array.isArray(values) ? values : []).map((v) => (typeof v === 'string' ? v : v?.label)))
    fields.set(field, labels)
  })
  return fields
}

/**
 * Validates a Catalog against the rules in docs/spec-fragenkataloge.md §3.2.
 * @returns {{ errors: Array<{path: string, message: string}>, warnings: Array<{path: string, message: string}> }}
 */
export function validateCatalog(catalog) {
  const errors = []
  const warnings = []

  if (!catalog || typeof catalog !== 'object') {
    addFinding(errors, '', 'Catalog must be an object.')
    return { errors, warnings }
  }

  if (!String(catalog.id || '').trim()) addFinding(errors, 'id', 'Catalog id is required.')
  if (!String(catalog.name || '').trim()) addFinding(errors, 'name', 'Catalog name is required.')
  if (!Number.isInteger(catalog.version) || catalog.version < 1) {
    addFinding(errors, 'version', 'Catalog version must be a positive integer.')
  }
  if (!Number.isInteger(catalog.schemaVersion) || catalog.schemaVersion < 1) {
    addFinding(errors, 'schemaVersion', 'Catalog schemaVersion must be a positive integer.')
  }

  if (!Array.isArray(catalog.categories) || catalog.categories.length === 0) {
    addFinding(errors, 'categories', 'Catalog must have at least one category.')
    return { errors, warnings }
  }

  const metadataCategories = catalog.categories.filter((c) => c && c.isMetadata)
  if (metadataCategories.length === 0) {
    addFinding(errors, 'categories', 'Catalog must have exactly one metadata category, found none.')
  } else if (metadataCategories.length > 1) {
    addFinding(
      errors,
      'categories',
      `Catalog must have exactly one metadata category, found ${metadataCategories.length}.`
    )
  }
  const knownMetadataFields = collectKnownMetadataFields(metadataCategories[0])

  const seenCategoryIds = new Set()
  catalog.categories.forEach((category) => {
    validateCategory(category, seenCategoryIds, errors, warnings, knownMetadataFields)
  })

  return { errors, warnings }
}
