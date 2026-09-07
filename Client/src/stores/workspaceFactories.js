// Pure entity constructors shared by the store and the migration functions.
// No Pinia/Vue dependency on purpose — these must stay trivially testable and
// usable outside a component/store context (e.g. from migrations.js).

export function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function createWorkspace(projects = [], questionnaires = []) {
  return {
    id: createId('workspace'),
    projects: Array.isArray(projects) ? projects : [],
    questionnaires: Array.isArray(questionnaires) ? questionnaires : [],
    // Vocabulary and comparison state. A freshly created workspace carries them
    // from the start so callers never have to guard; a *stored* workspace that
    // predates them gets them from normalizeWorkspaceVocabularyFields on load.
    vocabulary: [],
    comparisonOverrides: {},
    dismissedSuggestions: []
  }
}

export function createProject(name, questionnaireIds = [], defaultCatalogId = '') {
  return {
    id: createId('project'),
    name: name || 'New project',
    questionnaireIds: Array.isArray(questionnaireIds) ? questionnaireIds : [],
    defaultCatalogId: defaultCatalogId || ''
  }
}

export function createQuestionnaire(name, categories = []) {
  return {
    id: createId('questionnaire'),
    name: name || 'New questionnaire',
    categories: Array.isArray(categories) ? categories : []
  }
}

/**
 * Slugifies `text` into an id, disambiguating collisions with a numeric
 * suffix (-2, -3, …). Used for stable, human-readable catalog/category/entry
 * ids that only change when the editor's explicit "regenerate id" action is
 * used — not automatically on every title edit.
 */
export function generateSlugId(text, existingIds = []) {
  const base =
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 50) || 'item'
  const taken = new Set(existingIds)
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}
