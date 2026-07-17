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
    questionnaires: Array.isArray(questionnaires) ? questionnaires : []
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
