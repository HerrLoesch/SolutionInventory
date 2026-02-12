export function createWorkspace(projects = [], questionnaires = []) {
  return {
    id: createId('workspace'),
    projects: Array.isArray(projects) ? projects : [],
    questionnaires: Array.isArray(questionnaires) ? questionnaires : []
  }
}

export function createProject(name, questionnaireIds = []) {
  return {
    id: createId('project'),
    name: name || 'New project',
    questionnaireIds: Array.isArray(questionnaireIds) ? questionnaireIds : []
  }
}

export function createQuestionnaire(name, categories = []) {
  return {
    id: createId('questionnaire'),
    name: name || 'New questionnaire',
    categories: Array.isArray(categories) ? categories : []
  }
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}
