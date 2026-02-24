import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getCategoriesData } from '../services/categoriesService'

const STORAGE_KEY = 'solution-inventory-data'
const STORAGE_VERSION = 1

export const useWorkspaceStore = defineStore('workspace', () => {
  function createId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
  }

  function createWorkspace(projects = [], questionnaires = []) {
    return {
      id: createId('workspace'),
      projects: Array.isArray(projects) ? projects : [],
      questionnaires: Array.isArray(questionnaires) ? questionnaires : []
    }
  }

  function createProject(name, questionnaireIds = []) {
    return {
      id: createId('project'),
      name: name || 'New project',
      questionnaireIds: Array.isArray(questionnaireIds) ? questionnaireIds : []
    }
  }

  function createQuestionnaire(name, categories = []) {
    return {
      id: createId('questionnaire'),
      name: name || 'New questionnaire',
      categories: Array.isArray(categories) ? categories : []
    }
  }

  const workspace = ref(createWorkspace())
  const activeQuestionnaireId = ref('')
  const openQuestionnaireIds = ref([])
  const activeWorkspaceTabId = ref('')
  const openProjectSummaryIds = ref([])
  const lastSaved = ref('')
  const autoSaveStarted = ref(false)

  const activeQuestionnaire = computed(() => {
    return workspace.value.questionnaires.find((item) => item.id === activeQuestionnaireId.value) || null
  })

  const activeCategories = computed(() => {
    return activeQuestionnaire.value?.categories || []
  })

  const openTabs = computed(() => {
    return openQuestionnaireIds.value
      .map((id) => workspace.value.questionnaires.find((item) => item.id === id))
      .filter(Boolean)
      .map((questionnaire) => ({
        id: questionnaire.id,
        label: getTabLabel(questionnaire),
        categories: questionnaire.categories
      }))
  })

  const workspaceTabs = computed(() => {
    const projectTabs = openProjectSummaryIds.value
      .map((projectId) => workspace.value.projects.find((project) => project.id === projectId))
      .filter(Boolean)
      .map((project) => ({
        id: toProjectTabId(project.id),
        type: 'project-summary',
        label: project.name,
        projectId: project.id
      }))

    const questionnaireTabs = openQuestionnaireIds.value
      .map((id) => workspace.value.questionnaires.find((item) => item.id === id))
      .filter(Boolean)
      .map((questionnaire) => ({
        id: questionnaire.id,
        type: 'questionnaire',
        label: getTabLabel(questionnaire),
        categories: questionnaire.categories
      }))

    return [...projectTabs, ...questionnaireTabs]
  })

  function initFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      seedWorkspace()
      return
    }

    try {
      const data = JSON.parse(saved)
      if (data.version === STORAGE_VERSION && data.workspace) {
        workspace.value = data.workspace
        activeQuestionnaireId.value = ''
        openQuestionnaireIds.value = []
        activeWorkspaceTabId.value = ''
        openProjectSummaryIds.value = []
        hydrateLastSaved(data.timestamp)
        return
      }

      if (data.version === STORAGE_VERSION && data.categories) {
        const initialQuestionnaire = createQuestionnaire('Current questionnaire', data.categories)
        workspace.value = createWorkspace([], [initialQuestionnaire])
        activeQuestionnaireId.value = ''
        openQuestionnaireIds.value = []
        activeWorkspaceTabId.value = ''
        openProjectSummaryIds.value = []
        hydrateLastSaved(data.timestamp)
        return
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error)
    }

    seedWorkspace()
  }

  function seedWorkspace() {
    const catalogData = getCategoriesData()
    const initialQuestionnaire = createQuestionnaire('Current questionnaire', catalogData.categories)
    workspace.value = createWorkspace([], [initialQuestionnaire])
    activeQuestionnaireId.value = ''
    openQuestionnaireIds.value = []
    activeWorkspaceTabId.value = ''
    openProjectSummaryIds.value = []
  }

  function startAutoSave() {
    if (autoSaveStarted.value) return
    autoSaveStarted.value = true
    watch(
      () => [workspace.value, activeQuestionnaireId.value, openQuestionnaireIds.value, activeWorkspaceTabId.value, openProjectSummaryIds.value],
      () => persist(),
      { deep: true }
    )
  }

  function persist() {
    try {
      const dataToSave = {
        version: STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        workspace: workspace.value,
        activeQuestionnaireId: activeQuestionnaireId.value,
        openQuestionnaireIds: openQuestionnaireIds.value,
        activeWorkspaceTabId: activeWorkspaceTabId.value,
        openProjectSummaryIds: openProjectSummaryIds.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
      hydrateLastSaved(dataToSave.timestamp)
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  function hydrateLastSaved(timestamp) {
    if (!timestamp) return
    const savedDate = new Date(timestamp)
    lastSaved.value = savedDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  function clearStorage() {
    if (!confirm('Möchten Sie wirklich alle gespeicherten Daten löschen?')) return
    localStorage.removeItem(STORAGE_KEY)
    seedWorkspace()
    lastSaved.value = ''
  }

  function setActiveQuestionnaire(questionnaireId) {
    if (!openQuestionnaireIds.value.includes(questionnaireId)) return
    activeQuestionnaireId.value = questionnaireId
    activeWorkspaceTabId.value = questionnaireId
  }

  function openQuestionnaire(questionnaireId) {
    if (!questionnaireId || !getQuestionnaireById(questionnaireId)) return
    if (!openQuestionnaireIds.value.includes(questionnaireId)) {
      openQuestionnaireIds.value.push(questionnaireId)
    }
    activeQuestionnaireId.value = questionnaireId
    activeWorkspaceTabId.value = questionnaireId
  }

  function closeQuestionnaire(questionnaireId) {
    if (!questionnaireId) return
    openQuestionnaireIds.value = openQuestionnaireIds.value.filter((id) => id !== questionnaireId)
    if (activeQuestionnaireId.value !== questionnaireId) return
    activeQuestionnaireId.value = openQuestionnaireIds.value[0] || ''
    activeWorkspaceTabId.value = activeQuestionnaireId.value
  }

  function openProjectSummary(projectId) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    if (!openProjectSummaryIds.value.includes(projectId)) {
      openProjectSummaryIds.value.push(projectId)
    }
    activeWorkspaceTabId.value = toProjectTabId(projectId)
  }

  function setActiveWorkspaceTab(tabId) {
    if (!tabId) return
    if (isProjectTabId(tabId)) {
      const projectId = fromProjectTabId(tabId)
      if (!openProjectSummaryIds.value.includes(projectId)) return
      activeWorkspaceTabId.value = tabId
      return
    }

    // questionnaire tab
    if (!openQuestionnaireIds.value.includes(tabId)) return
    activeQuestionnaireId.value = tabId
    activeWorkspaceTabId.value = tabId
  }

  function closeWorkspaceTab(tabId) {
    if (!tabId) return

    if (isProjectTabId(tabId)) {
      const projectId = fromProjectTabId(tabId)
      openProjectSummaryIds.value = openProjectSummaryIds.value.filter((id) => id !== projectId)
      if (activeWorkspaceTabId.value !== tabId) return
      const nextTab = workspaceTabs.value[0]
      activeWorkspaceTabId.value = nextTab?.id || ''
      return
    }

    // questionnaire tab
    closeQuestionnaire(tabId)
    if (activeWorkspaceTabId.value === tabId) {
      const nextTab = workspaceTabs.value[0]
      activeWorkspaceTabId.value = nextTab?.id || ''
    }
  }

  function updateQuestionnaireCategories(questionnaireId, categories) {
    const questionnaire = getQuestionnaireById(questionnaireId)
    if (!questionnaire) return
    questionnaire.categories = normalizeCategories(categories || [])
  }

  function addProject(name) {
    const project = {
      ...createProject(name, []),
      expanded: true
    }
    workspace.value.projects.push(project)
    return project.id
  }

  function deleteProject(projectId) {
    workspace.value.projects = workspace.value.projects.filter((project) => project.id !== projectId)
  }

  function renameProject(projectId, name) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    const nextName = String(name || '').trim()
    if (!nextName) return
    project.name = nextName
  }

  function addQuestionnaire(name, categories, projectId) {
    const catalogData = getCategoriesData()
    const questionnaire = createQuestionnaire(
      name || 'New questionnaire',
      normalizeCategories(categories || catalogData.categories)
    )
    workspace.value.questionnaires.push(questionnaire)

    if (projectId) {
      const project = workspace.value.projects.find((item) => item.id === projectId)
      if (project) {
        project.questionnaireIds = Array.isArray(project.questionnaireIds)
          ? [...project.questionnaireIds, questionnaire.id]
          : [questionnaire.id]
        project.expanded = true
      }
    }

    openQuestionnaire(questionnaire.id)
    return questionnaire.id
  }

  function importProject(projectName, questionnaires) {
    const name = String(projectName || '').trim()
    if (!name) return
    const projectId = addProject(name)
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    ;(questionnaires || []).forEach((questionnaire) => {
      const nextName = String(questionnaire?.name || 'Imported questionnaire').trim() || 'Imported questionnaire'
      const categories = normalizeCategories(questionnaire?.categories || [])
      const created = createQuestionnaire(nextName, categories)
      workspace.value.questionnaires.push(created)
      project.questionnaireIds = Array.isArray(project.questionnaireIds)
        ? [...project.questionnaireIds, created.id]
        : [created.id]
    })
  }

  function deleteQuestionnaire(questionnaireId) {
    if (!questionnaireId) return
    workspace.value.projects.forEach((project) => {
      project.questionnaireIds = (project.questionnaireIds || []).filter((id) => id !== questionnaireId)
    })
    workspace.value.questionnaires = workspace.value.questionnaires.filter((item) => item.id !== questionnaireId)
    const remainingIds = new Set(workspace.value.questionnaires.map((item) => item.id))
    openQuestionnaireIds.value = openQuestionnaireIds.value.filter((id) => remainingIds.has(id))
    if (!remainingIds.has(activeQuestionnaireId.value)) {
      activeQuestionnaireId.value = openQuestionnaireIds.value[0] || ''
    }
  }

  function renameQuestionnaire(questionnaireId, name) {
    const questionnaire = getQuestionnaireById(questionnaireId)
    if (!questionnaire) return
    const nextName = String(name || '').trim()
    if (!nextName) return
    questionnaire.name = nextName
  }

  function moveQuestionnaire(fromProjectId, toProjectId, questionnaireId) {
    if (fromProjectId === toProjectId) return
    const fromProject = workspace.value.projects.find((item) => item.id === fromProjectId)
    const toProject = workspace.value.projects.find((item) => item.id === toProjectId)
    if (!fromProject || !toProject) return
    const index = fromProject.questionnaireIds.findIndex((id) => id === questionnaireId)
    if (index === -1) return
    const [movedId] = fromProject.questionnaireIds.splice(index, 1)
    toProject.questionnaireIds.push(movedId)
  }

  function getQuestionnaireById(questionnaireId) {
    return workspace.value.questionnaires.find((item) => item.id === questionnaireId)
  }

  function getProjectQuestionnaires(project) {
    const ids = Array.isArray(project?.questionnaireIds) ? project.questionnaireIds : []
    return ids.map((id) => getQuestionnaireById(id)).filter(Boolean)
  }

  function toProjectTabId(projectId) {
    return `project:${projectId}`
  }

  function isProjectTabId(tabId) {
    return String(tabId || '').startsWith('project:')
  }

  function fromProjectTabId(tabId) {
    return String(tabId || '').slice('project:'.length)
  }

  function saveQuestionnaire(questionnaireId) {
    const questionnaire = getQuestionnaireById(questionnaireId)
    if (!questionnaire) return
    const exportData = { categories: questionnaire.categories }
    const data = JSON.stringify(exportData, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(questionnaire.name || 'questionnaire')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function exportProject(projectId) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    const questionnaires = getProjectQuestionnaires(project).map((questionnaire) => ({
      id: questionnaire.id,
      name: questionnaire.name,
      categories: questionnaire.categories
    }))
    const exportData = {
      project: {
        id: project.id,
        name: project.name
      },
      questionnaires
    }
    const data = JSON.stringify(exportData, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(project.name || 'project')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function saveActiveQuestionnaire() {
    saveQuestionnaire(activeQuestionnaireId.value)
  }

  function addQuestionnaireFromCategories(name, categories) {
    return addQuestionnaire(name, categories)
  }

  function addAnswer(entryId) {
    const entry = findEntry(entryId)
    if (!entry || !isEntryApplicable(entry)) return
    entry.answers = [...entry.answers, { technology: '', status: '', comments: '' }]
  }

  function deleteAnswer(entryId, answerIdx) {
    const entry = findEntry(entryId)
    if (!entry || entry.answers.length <= 1) return
    entry.answers = entry.answers.filter((_, idx) => idx !== answerIdx)
  }

  function setApplicability(entry, value) {
    if (!applicabilityOptions.includes(value)) {
      entry.applicability = 'applicable'
      return
    }

    entry.applicability = value

    if (['does not apply', 'unknown'].includes(value)) {
      entry.answers = [{ technology: value, status: '', comments: '' }]
    } else {
      const filteredAnswers = (entry.answers || []).filter(
        (answer) => !['does not apply', 'unknown'].includes(answer.technology)
      )
      entry.answers = filteredAnswers.length > 0
        ? filteredAnswers
        : [{ technology: '', status: '', comments: '' }]
    }
  }

  function isEntryApplicable(entry) {
    return (entry.applicability || 'applicable') === 'applicable'
  }

  function findEntry(entryId) {
    for (const category of activeCategories.value) {
      if (!category.entries) continue
      for (const entry of category.entries) {
        if (entry.id === entryId) return entry
      }
    }
    return null
  }

  function getStatusTooltip(status) {
    const opt = statusOptions.find((option) => option.label === status)
    return opt ? opt.description : ''
  }

  function renderTextWithLinks(value) {
    if (!value) return ''

    const tokens = []
    let working = String(value)

    working = working.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
      const token = `__LINK_${tokens.length}__`
      tokens.push({ label, url })
      return token
    })

    working = working.replace(/https?:\/\/[^\s)]+/g, (url) => {
      const token = `__LINK_${tokens.length}__`
      tokens.push({ label: url, url })
      return token
    })

    working = escapeHtml(working)

    tokens.forEach((token, idx) => {
      const placeholder = `__LINK_${idx}__`
      const anchor = `<a href="${escapeHtml(token.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(token.label)}</a>`
      working = working.replace(placeholder, anchor)
    })

    return working
  }

  function getExampleItems(examples) {
    if (!examples) return []

    if (Array.isArray(examples)) {
      return examples
        .map((example) => {
          if (typeof example === 'string') {
            const label = example.trim()
            return label ? { label, description: '' } : null
          }
          if (example && typeof example === 'object') {
            const label = String(example.label || '').trim()
            if (!label) return null
            
            let description = example.description || ''
            
            // Append tools in parentheses if tools array exists and has items
            if (Array.isArray(example.tools) && example.tools.length > 0) {
              const toolsText = example.tools.join(', ')
              description = description.trim()
              // Remove trailing period if present before adding tools
              if (description.endsWith('.')) {
                description = description.slice(0, -1)
              }
              description = `${description} (${toolsText}).`
            }
            
            return { label, description }
          }
          return null
        })
        .filter(Boolean)
    }

    if (typeof examples === 'string') {
      return examples
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((label) => ({ label, description: '' }))
    }

    return []
  }

  function normalizeCategories(categories) {
    const output = Array.isArray(categories)
      ? JSON.parse(JSON.stringify(categories))
      : []

    output.forEach((category) => {
      if (!category.entries) return
      category.entries.forEach((entry) => {
        if (!entry.applicability) {
          entry.applicability = 'applicable'
        }
        if (['does not apply', 'unknown'].includes(entry.applicability)) {
          entry.answers = [{ technology: entry.applicability, status: '', comments: '' }]
          return
        }
        if (!entry.answers || entry.answers.length === 0) {
          entry.answers = [{ technology: '', status: '', comments: '' }]
        }
      })
    })

    return output
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }


  function getTabLabel(questionnaire) {
    const productName = getProjectName(questionnaire.categories)
    return questionnaire.name || productName || 'New questionnaire'
  }

  function getProjectName(categoriesData) {
    if (!categoriesData || !categoriesData.length) return ''
    const metaCategory = categoriesData.find((category) => category.isMetadata)
    return metaCategory?.metadata?.productName || ''
  }

  function sanitizeFilename(value) {
    return String(value || 'questionnaire')
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
  }

  const statusOptions = getCategoriesData().statusOptions

  const applicabilityOptions = ['applicable', 'not applicable', 'unknown']

  return {
    workspace,
    activeQuestionnaireId,
    openQuestionnaireIds,
    activeWorkspaceTabId,
    openProjectSummaryIds,
    lastSaved,
    activeQuestionnaire,
    activeCategories,
    openTabs,
    workspaceTabs,
    initFromStorage,
    startAutoSave,
    persist,
    clearStorage,
    setActiveQuestionnaire,
    setActiveWorkspaceTab,
    openQuestionnaire,
    openProjectSummary,
    closeQuestionnaire,
    closeWorkspaceTab,
    updateQuestionnaireCategories,
    addAnswer,
    deleteAnswer,
    setApplicability,
    isEntryApplicable,
    getStatusTooltip,
    renderTextWithLinks,
    getExampleItems,
    statusOptions,
    applicabilityOptions,
    addProject,
    deleteProject,
    renameProject,
    addQuestionnaire,
    importProject,
    moveQuestionnaire,
    getQuestionnaireById,
    getProjectQuestionnaires,
    deleteQuestionnaire,
    renameQuestionnaire,
    saveQuestionnaire,
    saveActiveQuestionnaire,
    exportProject,
    addQuestionnaireFromCategories
  }
})
