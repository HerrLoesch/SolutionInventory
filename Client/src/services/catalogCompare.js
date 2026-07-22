// Compares an imported catalog against a reference catalog (typically a
// project's current default catalog) and reports how they differ. This powers
// the non-blocking "comparison report" in CatalogImportDialog: unlike
// validateCatalog (schema errors, which gate the import), every difference here
// is advisory — the user decides whether the drift is acceptable.
//
// Pure and deterministic: categories are matched by id, entries by id within a
// category, and metadata vocabulary by field/value label.

function entriesOf(category) {
  return Array.isArray(category?.entries) ? category.entries : []
}

function indexById(items) {
  const map = new Map()
  ;(Array.isArray(items) ? items : []).forEach((item) => {
    if (item && item.id != null) map.set(item.id, item)
  })
  return map
}

/** Which fields of an entry differ between reference and imported. */
function entryChanges(refEntry, impEntry) {
  const changed = []
  if (String(refEntry.aspect || '') !== String(impEntry.aspect || '')) changed.push('aspect')
  if (String(refEntry.description || '') !== String(impEntry.description || '')) changed.push('description')
  return changed
}

function diffEntries(refCategory, impCategory) {
  const refEntries = indexById(entriesOf(refCategory))
  const impEntries = indexById(entriesOf(impCategory))
  const entriesAdded = []
  const entriesRemoved = []
  const entriesChanged = []

  impEntries.forEach((impEntry, id) => {
    const refEntry = refEntries.get(id)
    if (!refEntry) {
      entriesAdded.push({ id, aspect: impEntry.aspect || '' })
      return
    }
    const changes = entryChanges(refEntry, impEntry)
    if (changes.length) entriesChanged.push({ id, aspect: impEntry.aspect || '', changes })
  })
  refEntries.forEach((refEntry, id) => {
    if (!impEntries.has(id)) entriesRemoved.push({ id, aspect: refEntry.aspect || '' })
  })

  return { entriesAdded, entriesRemoved, entriesChanged }
}

/** Normalizes a metadataOptions value list to a Set of string labels. */
function optionLabels(values) {
  return new Set(
    (Array.isArray(values) ? values : []).map((v) => (typeof v === 'string' ? v : v?.label)).filter(Boolean)
  )
}

function metadataCategoryOf(catalog) {
  return (Array.isArray(catalog?.categories) ? catalog.categories : []).find((c) => c && c.isMetadata) || null
}

function diffMetadata(reference, imported) {
  const refOptions = metadataCategoryOf(reference)?.metadataOptions || {}
  const impOptions = metadataCategoryOf(imported)?.metadataOptions || {}
  const refFields = new Set(Object.keys(refOptions))
  const impFields = new Set(Object.keys(impOptions))

  const fieldsAdded = [...impFields].filter((f) => !refFields.has(f))
  const fieldsRemoved = [...refFields].filter((f) => !impFields.has(f))
  const valuesChanged = []

  ;[...impFields]
    .filter((f) => refFields.has(f))
    .forEach((field) => {
      const refLabels = optionLabels(refOptions[field])
      const impLabels = optionLabels(impOptions[field])
      const added = [...impLabels].filter((v) => !refLabels.has(v))
      const removed = [...refLabels].filter((v) => !impLabels.has(v))
      if (added.length || removed.length) valuesChanged.push({ field, added, removed })
    })

  return { fieldsAdded, fieldsRemoved, valuesChanged }
}

/**
 * Compares `imported` against `reference`.
 * @returns {{
 *   hasReference: boolean,
 *   categoriesAdded: Array<{id: string, title: string}>,
 *   categoriesRemoved: Array<{id: string, title: string}>,
 *   categoriesChanged: Array<{id: string, title: string, entriesAdded: any[], entriesRemoved: any[], entriesChanged: any[]}>,
 *   metadata: {fieldsAdded: string[], fieldsRemoved: string[], valuesChanged: Array<{field: string, added: string[], removed: string[]}>},
 *   summary: object
 * }}
 */
export function compareCatalogs(imported, reference) {
  const empty = {
    hasReference: false,
    categoriesAdded: [],
    categoriesRemoved: [],
    categoriesChanged: [],
    metadata: { fieldsAdded: [], fieldsRemoved: [], valuesChanged: [] },
    summary: {
      categoriesAdded: 0,
      categoriesRemoved: 0,
      categoriesChanged: 0,
      entriesAdded: 0,
      entriesRemoved: 0,
      entriesChanged: 0,
      metadataChanges: 0,
      totalChanges: 0,
      identical: true
    }
  }

  if (!reference || typeof reference !== 'object') return empty

  const refCategories = indexById(reference.categories)
  const impCategories = indexById(imported?.categories)

  const categoriesAdded = []
  const categoriesRemoved = []
  const categoriesChanged = []

  impCategories.forEach((impCategory, id) => {
    const refCategory = refCategories.get(id)
    if (!refCategory) {
      categoriesAdded.push({ id, title: impCategory.title || '' })
      return
    }
    // The metadata category carries no entries; its drift is reported via the
    // separate metadata section, so skip entry-diffing it here.
    if (impCategory.isMetadata || refCategory.isMetadata) return
    const { entriesAdded, entriesRemoved, entriesChanged } = diffEntries(refCategory, impCategory)
    if (entriesAdded.length || entriesRemoved.length || entriesChanged.length) {
      categoriesChanged.push({ id, title: impCategory.title || '', entriesAdded, entriesRemoved, entriesChanged })
    }
  })
  refCategories.forEach((refCategory, id) => {
    if (!impCategories.has(id)) categoriesRemoved.push({ id, title: refCategory.title || '' })
  })

  const metadata = diffMetadata(reference, imported)

  const entriesAdded = categoriesChanged.reduce((n, c) => n + c.entriesAdded.length, 0)
  const entriesRemoved = categoriesChanged.reduce((n, c) => n + c.entriesRemoved.length, 0)
  const entriesChanged = categoriesChanged.reduce((n, c) => n + c.entriesChanged.length, 0)
  const metadataChanges = metadata.fieldsAdded.length + metadata.fieldsRemoved.length + metadata.valuesChanged.length
  const totalChanges =
    categoriesAdded.length + categoriesRemoved.length + entriesAdded + entriesRemoved + entriesChanged + metadataChanges

  return {
    hasReference: true,
    categoriesAdded,
    categoriesRemoved,
    categoriesChanged,
    metadata,
    summary: {
      categoriesAdded: categoriesAdded.length,
      categoriesRemoved: categoriesRemoved.length,
      categoriesChanged: categoriesChanged.length,
      entriesAdded,
      entriesRemoved,
      entriesChanged,
      metadataChanges,
      totalChanges,
      identical: totalChanges === 0
    }
  }
}
