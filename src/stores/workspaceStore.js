import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getCategoriesData } from '../services/categoriesService'
import { createProject, createQuestionnaire, createWorkspace } from '../models/projectModels'

const STORAGE_KEY = 'solution-inventory-data'
const STORAGE_VERSION = 1

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspace = ref(createWorkspace())
  const activeQuestionnaireId = ref('')
  const openQuestionnaireIds = ref([])
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
        activeQuestionnaireId.value = data.activeQuestionnaireId || data.workspace.questionnaires?.[0]?.id || ''
        if (Array.isArray(data.openQuestionnaireIds) && data.openQuestionnaireIds.length) {
          openQuestionnaireIds.value = data.openQuestionnaireIds
        } else if (activeQuestionnaireId.value) {
          openQuestionnaireIds.value = [activeQuestionnaireId.value]
        } else {
          openQuestionnaireIds.value = []
        }
        hydrateLastSaved(data.timestamp)
        return
      }

      if (data.version === STORAGE_VERSION && data.categories) {
        const initialQuestionnaire = createQuestionnaire('Current questionnaire', data.categories)
        workspace.value = createWorkspace([], [initialQuestionnaire])
        activeQuestionnaireId.value = initialQuestionnaire.id
        openQuestionnaireIds.value = [initialQuestionnaire.id]
        hydrateLastSaved(data.timestamp)
        return
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error)
    }

    seedWorkspace()
  }

  function seedWorkspace() {
    const initialQuestionnaire = createQuestionnaire('Current questionnaire', getCategoriesData())
    workspace.value = createWorkspace([], [initialQuestionnaire])
    activeQuestionnaireId.value = initialQuestionnaire.id
    openQuestionnaireIds.value = [initialQuestionnaire.id]
  }

  function startAutoSave() {
    if (autoSaveStarted.value) return
    autoSaveStarted.value = true
    watch(
      () => [workspace.value, activeQuestionnaireId.value, openQuestionnaireIds.value],
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
        openQuestionnaireIds: openQuestionnaireIds.value
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
    openQuestionnaire(questionnaireId)
  }

  function openQuestionnaire(questionnaireId) {
    if (!questionnaireId || !getQuestionnaireById(questionnaireId)) return
    if (!openQuestionnaireIds.value.includes(questionnaireId)) {
      openQuestionnaireIds.value.push(questionnaireId)
    }
    activeQuestionnaireId.value = questionnaireId
  }

  function updateQuestionnaireCategories(questionnaireId, categories) {
    const questionnaire = getQuestionnaireById(questionnaireId)
    if (!questionnaire) return
    questionnaire.categories = categories
  }

  function addProject(name) {
    workspace.value.projects.push({
      ...createProject(name, []),
      expanded: true
    })
  }

  function deleteProject(projectId) {
    workspace.value.projects = workspace.value.projects.filter((project) => project.id !== projectId)
  }

  function addQuestionnaire(name, categories, projectId) {
    const questionnaire = createQuestionnaire(name || 'New questionnaire', categories || getCategoriesData())
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

  function saveActiveQuestionnaire() {
    const questionnaire = getQuestionnaireById(activeQuestionnaireId.value)
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

  function addQuestionnaireFromCategories(name, categories) {
    return addQuestionnaire(name, categories)
  }

  function getTabLabel(questionnaire) {
    const productName = getProjectName(questionnaire.categories)
    return productName || questionnaire.name || 'New questionnaire'
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

  return {
    workspace,
    activeQuestionnaireId,
    openQuestionnaireIds,
    lastSaved,
    activeQuestionnaire,
    activeCategories,
    openTabs,
    initFromStorage,
    startAutoSave,
    persist,
    clearStorage,
    setActiveQuestionnaire,
    openQuestionnaire,
    updateQuestionnaireCategories,
    addProject,
    deleteProject,
    addQuestionnaire,
    moveQuestionnaire,
    getQuestionnaireById,
    getProjectQuestionnaires,
    saveActiveQuestionnaire,
    addQuestionnaireFromCategories
  }
})
