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
  const autoSaveEnabled = ref(true)
  const pendingNavigation = ref(null) // { questionnaireId, categoryId, entryId } | null
  const pendingMenuAction = ref(null) // { action: string, payload?: any } | null
  const workspaceDirNeeded = ref(false)
  const questionnaireHiddenEntries = ref({}) // Record<questionnaireId, string[]>

  const activeQuestionnaire = computed(() => {
    return workspace.value.questionnaires.find((item) => item.id === activeQuestionnaireId.value) || null
  })

  const activeProjectId = computed(() => {
    const tabId = activeWorkspaceTabId.value
    if (!tabId) return ''
    if (isProjectTabId(tabId)) return fromProjectTabId(tabId)
    // questionnaire tab – find the project that owns it
    const project = workspace.value.projects.find((p) =>
      (p.questionnaireIds || []).includes(tabId)
    )
    return project?.id || ''
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

  function migrateProjectRadar(project) {
    // Already migrated to new format
    if (Array.isArray(project.radar)) return
    // Migrate from legacy radarRefs + radarOverrides to unified radar array
    const refs = Array.isArray(project.radarRefs) ? project.radarRefs : []
    const overrides = Array.isArray(project.radarOverrides) ? project.radarOverrides : []
    project.radar = refs.map((ref) => {
      const norm = String(ref.option || '').trim().toLowerCase()
      const override = overrides.find(
        (o) => o.entryId === ref.entryId && String(o.option || '').toLowerCase() === norm
      )
      return {
        entryId: ref.entryId,
        option: String(ref.option || '').trim(),
        category: String(override?.categoryOverride || '').trim(),
        status: String(override?.status || '').trim(),
        shortComment: String(override?.shortComment || '').trim(),
        description: String(override?.comment || '').trim()
      }
    })
    delete project.radarRefs
    delete project.radarOverrides
  }

  function applyStoredData(data) {
    if (data.version === STORAGE_VERSION && data.workspace) {
      workspace.value = data.workspace
      // Migrate any projects still using the legacy two-array format
      ;(workspace.value.projects || []).forEach(migrateProjectRadar)
      // Restore open tabs and active state, filtering out IDs that no longer exist
      const existingIds = new Set(data.workspace.questionnaires?.map((q) => q.id) || [])
      const restoredOpen = (data.openQuestionnaireIds || []).filter((id) => existingIds.has(id))
      openQuestionnaireIds.value = restoredOpen
      activeQuestionnaireId.value = existingIds.has(data.activeQuestionnaireId) ? data.activeQuestionnaireId : restoredOpen[0] || ''
      const existingProjectIds = new Set(data.workspace.projects?.map((p) => p.id) || [])
      openProjectSummaryIds.value = (data.openProjectSummaryIds || []).filter((id) => existingProjectIds.has(id))
      activeWorkspaceTabId.value = data.activeWorkspaceTabId || activeQuestionnaireId.value
      questionnaireHiddenEntries.value = data.questionnaireHiddenEntries || {}
      hydrateLastSaved(data.timestamp)
      return true
    }
    if (data.version === STORAGE_VERSION && data.categories) {
      const initialQuestionnaire = createQuestionnaire('Current questionnaire', data.categories)
      workspace.value = createWorkspace([], [initialQuestionnaire])
      activeQuestionnaireId.value = ''
      openQuestionnaireIds.value = []
      activeWorkspaceTabId.value = ''
      openProjectSummaryIds.value = []
      questionnaireHiddenEntries.value = {}
      hydrateLastSaved(data.timestamp)
      return true
    }
    return false
  }

  async function initFromStorage() {
    // --- Electron: file-based storage ---
    if (window.electronAPI) {
      const dir = await window.electronAPI.getWorkspaceDir()
      if (!dir) {
        workspaceDirNeeded.value = true
        return
      }
      workspaceDirNeeded.value = false
      const result = await window.electronAPI.readDataFile()
      if (result.success) {
        try {
          if (!applyStoredData(result.data)) seedWorkspace()
        } catch (error) {
          console.error('Error applying stored data:', error)
          seedWorkspace()
        }
      } else {
        seedWorkspace()
      }
      return
    }

    // --- Web: localStorage ---
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      seedWorkspace()
      return
    }
    try {
      const data = JSON.parse(saved)
      if (!applyStoredData(data)) seedWorkspace()
    } catch (error) {
      console.error('Error loading from localStorage:', error)
      seedWorkspace()
    }
  }

  async function setWorkspaceDir(dirPath) {
    if (!window.electronAPI) return
    await window.electronAPI.setWorkspaceDir(dirPath)
    await initFromStorage()
  }

  function loadFromData(data) {
    if (!data) return false
    const ok = applyStoredData(data)
    if (ok) {
      workspaceDirNeeded.value = false
      // If no tabs were restored, auto-open the first available item so the user
      // gets visual feedback that the workspace loaded successfully.
      if (openProjectSummaryIds.value.length === 0 && openQuestionnaireIds.value.length === 0) {
        const firstProject = workspace.value.projects?.[0]
        if (firstProject) {
          openProjectSummaryIds.value = [firstProject.id]
          activeWorkspaceTabId.value = toProjectTabId(firstProject.id)
        } else {
          const firstQuestionnaire = workspace.value.questionnaires?.[0]
          if (firstQuestionnaire) {
            openQuestionnaireIds.value = [firstQuestionnaire.id]
            activeQuestionnaireId.value = firstQuestionnaire.id
            activeWorkspaceTabId.value = firstQuestionnaire.id
          }
        }
      }
    }
    return ok
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

  let persistDebounceTimer = null

  function startAutoSave() {
    if (autoSaveStarted.value) return
    autoSaveStarted.value = true
    watch(
      () => [workspace.value, activeQuestionnaireId.value, openQuestionnaireIds.value, activeWorkspaceTabId.value, openProjectSummaryIds.value, questionnaireHiddenEntries.value],
      () => {
        if (!autoSaveEnabled.value) return
        clearTimeout(persistDebounceTimer)
        persistDebounceTimer = setTimeout(() => persist(), 1500)
      },
      { deep: true }
    )
  }

  async function persist() {
    const dataToSave = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      workspace: workspace.value,
      activeQuestionnaireId: activeQuestionnaireId.value,
      openQuestionnaireIds: openQuestionnaireIds.value,
      activeWorkspaceTabId: activeWorkspaceTabId.value,
      openProjectSummaryIds: openProjectSummaryIds.value,
      questionnaireHiddenEntries: questionnaireHiddenEntries.value
    }

    if (window.electronAPI) {
      try {
        await window.electronAPI.writeDataFile(JSON.stringify(dataToSave, null, 2))
        hydrateLastSaved(dataToSave.timestamp)
      } catch (error) {
        console.error('Error saving to file:', error)
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
        hydrateLastSaved(dataToSave.timestamp)
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }
    }
  }

  function hydrateLastSaved(timestamp) {
    if (!timestamp) return
    const savedDate = new Date(timestamp)
    lastSaved.value = savedDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  function toggleAutoSave() {
    autoSaveEnabled.value = !autoSaveEnabled.value
  }

  function dispatchMenuAction(action, payload = null) {
    pendingMenuAction.value = { action, payload }
  }

  function clearMenuAction() {
    pendingMenuAction.value = null
  }

  function newWorkspace() {
    workspace.value = createWorkspace()
    activeQuestionnaireId.value = ''
    openQuestionnaireIds.value = []
    activeWorkspaceTabId.value = ''
    openProjectSummaryIds.value = []
    questionnaireHiddenEntries.value = {}
    lastSaved.value = ''
  }

  function closeWorkspace() {
    newWorkspace()
    if (window.electronAPI) {
      workspaceDirNeeded.value = true
    }
  }

  /**
   * Saves the current workspace state to a specific directory (Electron only).
   * Used for "Save Workspace As" and "Duplicate Workspace".
   */
  async function persistTo(dirPath) {
    if (!window.electronAPI || !dirPath) return
    const dataToSave = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      workspace: workspace.value,
      activeQuestionnaireId: activeQuestionnaireId.value,
      openQuestionnaireIds: openQuestionnaireIds.value,
      activeWorkspaceTabId: activeWorkspaceTabId.value,
      openProjectSummaryIds: openProjectSummaryIds.value,
      questionnaireHiddenEntries: questionnaireHiddenEntries.value
    }
    try {
      await window.electronAPI.writeDataFileTo(dirPath, JSON.stringify(dataToSave, null, 2))
    } catch (error) {
      console.error('Error saving workspace to path:', error)
    }
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

  function navigateToEntry(questionnaireId, categoryId, entryId) {
    if (!questionnaireId) return
    openQuestionnaire(questionnaireId)
    pendingNavigation.value = { questionnaireId, categoryId, entryId }
  }

  function clearPendingNavigation() {
    pendingNavigation.value = null
  }

  function getQuestionnaireHiddenEntries(questionnaireId) {
    return new Set(questionnaireHiddenEntries.value[questionnaireId] || [])
  }

  function setQuestionnaireHiddenEntries(questionnaireId, entryIdSet) {
    questionnaireHiddenEntries.value = {
      ...questionnaireHiddenEntries.value,
      [questionnaireId]: [...entryIdSet]
    }
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

  function duplicateProject(projectId) {
    const source = workspace.value.projects.find((p) => p.id === projectId)
    if (!source) return
    const newProjectId = addProject(`${source.name} (Copy)`)
    const newProject = workspace.value.projects.find((p) => p.id === newProjectId)
    if (!newProject) return
    ;(source.questionnaireIds || []).forEach((qId) => {
      const q = getQuestionnaireById(qId)
      if (!q) return
      const copy = createQuestionnaire(q.name, normalizeCategories(q.categories))
      workspace.value.questionnaires.push(copy)
      newProject.questionnaireIds = [...(newProject.questionnaireIds || []), copy.id]
    })
    if (Array.isArray(source.radar)) newProject.radar = JSON.parse(JSON.stringify(source.radar))
    if (Array.isArray(source.radarCategoryOrder)) newProject.radarCategoryOrder = [...source.radarCategoryOrder]
    return newProjectId
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

  function importProject(projectName, questionnaires, radarData = {}) {
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
    if (Array.isArray(radarData.radar)) {
      project.radar = radarData.radar
    } else if (Array.isArray(radarData.radarRefs) || Array.isArray(radarData.radarOverrides)) {
      // Migrate legacy format from imported file
      Object.assign(project, { radarRefs: radarData.radarRefs, radarOverrides: radarData.radarOverrides })
      migrateProjectRadar(project)
    }
    if (Array.isArray(radarData.radarCategoryOrder)) project.radarCategoryOrder = radarData.radarCategoryOrder
  }

  function duplicateQuestionnaire(questionnaireId) {
    const source = getQuestionnaireById(questionnaireId)
    if (!source) return
    const copy = createQuestionnaire(`${source.name} (Copy)`, normalizeCategories(source.categories))
    workspace.value.questionnaires.push(copy)
    // Assign to the same project as original, if any
    const project = workspace.value.projects.find((p) =>
      (p.questionnaireIds || []).includes(questionnaireId)
    )
    if (project) {
      project.questionnaireIds = [...(project.questionnaireIds || []), copy.id]
    }
    openQuestionnaire(copy.id)
    return copy.id
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

  function unassignQuestionnaire(questionnaireId) {
    workspace.value.projects.forEach((project) => {
      project.questionnaireIds = (project.questionnaireIds || []).filter((id) => id !== questionnaireId)
    })
  }

  function assignQuestionnaireToProject(projectId, questionnaireId) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    if (!(project.questionnaireIds || []).includes(questionnaireId)) {
      project.questionnaireIds = [...(project.questionnaireIds || []), questionnaireId]
    }
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

  function reorderQuestionnaire(projectId, draggedId, beforeId) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    const ids = Array.isArray(project.questionnaireIds) ? [...project.questionnaireIds] : []
    const fromIndex = ids.indexOf(draggedId)
    if (fromIndex === -1) return
    ids.splice(fromIndex, 1)
    const toIndex = beforeId ? ids.indexOf(beforeId) : ids.length
    ids.splice(toIndex === -1 ? ids.length : toIndex, 0, draggedId)
    project.questionnaireIds = ids
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
        name: project.name,
        radar: Array.isArray(project.radar) ? project.radar : [],
        radarCategoryOrder: Array.isArray(project.radarCategoryOrder) ? project.radarCategoryOrder : []
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

  function updateProjectDeviationSettings(projectId, settings) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    project.deviationSettings = settings || {}
  }

  function updateProjectVisibilitySettings(projectId, settings) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    project.visibilitySettings = settings || {}
  }

  function setReferenceQuestionnaire(projectId, questionnaireId) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    // Toggle off if already set
    if (project.referenceQuestionnaireId === questionnaireId) {
      project.referenceQuestionnaireId = ''
    } else {
      project.referenceQuestionnaireId = questionnaireId
    }
  }

  function addAnswer(entryId) {
    const entry = findEntry(entryId)
    if (!entry || !isEntryApplicable(entry)) return
    entry.answers = [...entry.answers, { technology: '', status: '', comments: '', answerType: '', isRadarRef: false }]
  }

  function deleteAnswer(entryId, answerIdx) {
    const entry = findEntry(entryId)
    if (!entry || entry.answers.length <= 1) return
    entry.answers = entry.answers.filter((_, idx) => idx !== answerIdx)
  }

  function toggleProjectRadarRef(projectId, entryId, option, questionnaireId = '') {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project) return
    if (!Array.isArray(project.radar)) project.radar = []
    const norm = String(option || '').trim().toLowerCase()
    const idx = project.radar.findIndex(
      (r) => r.entryId === entryId && String(r.option || '').toLowerCase() === norm
    )
    if (idx !== -1) {
      project.radar.splice(idx, 1)
    } else {
      // Populate category, status and shortComment from the questionnaire entry
      let categoryTitle = ''
      let answerStatus = ''
      let answerComments = ''
      const projectQuestionnaires = workspace.value.questionnaires.filter(
        (q) => (project.questionnaireIds || []).includes(q.id)
      )
      const preferred = projectQuestionnaires.find((q) => q.id === questionnaireId)
      const toSearch = preferred
        ? [preferred, ...projectQuestionnaires.filter((q) => q.id !== questionnaireId)]
        : projectQuestionnaires
      for (const q of toSearch) {
        for (const cat of (q.categories || [])) {
          if (cat.isMetadata) continue
          const entry = (cat.entries || []).find((e) => e.id === entryId)
          if (entry) {
            categoryTitle = String(cat.title || '').trim()
            const answer = (entry.answers || []).find(
              (a) => String(a.technology || '').trim().toLowerCase() === norm
            )
            if (answer) {
              answerStatus = String(answer.status || '').trim()
              answerComments = String(answer.comments || '').trim()
            }
            break
          }
        }
        if (categoryTitle) break
      }
      project.radar.push({
        entryId,
        option: String(option || '').trim(),
        category: categoryTitle,
        status: answerStatus,
        shortComment: answerComments,
        description: ''
      })
    }
  }

  function isProjectRadarRef(projectId, entryId, option) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project || !Array.isArray(project.radar)) return false
    const norm = String(option || '').trim().toLowerCase()
    return project.radar.some(
      (r) => r.entryId === entryId && String(r.option || '').toLowerCase() === norm
    )
  }

  function getRadarOverride(projectId, entryId, option) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project || !Array.isArray(project.radar)) return null
    const norm = String(option || '').trim().toLowerCase()
    return project.radar.find(
      (r) => r.entryId === entryId && String(r.option || '').toLowerCase() === norm
    ) || null
  }

  function setRadarOverride(projectId, entryId, option, { status, comment, shortComment = '', categoryOverride = '' }) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project) return
    if (!Array.isArray(project.radar)) project.radar = []
    const norm = String(option || '').trim().toLowerCase()
    const idx = project.radar.findIndex(
      (r) => r.entryId === entryId && String(r.option || '').toLowerCase() === norm
    )
    if (idx !== -1) {
      const existing = project.radar[idx]
      project.radar.splice(idx, 1, {
        ...existing,
        status: String(status || ''),
        shortComment: String(shortComment || ''),
        description: String(comment || ''),
        category: String(categoryOverride || existing.category || '')
      })
    }
  }

  function setProjectRadarCategoryOrder(projectId, categoryOrder) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project) return
    project.radarCategoryOrder = Array.isArray(categoryOrder) ? [...categoryOrder] : []
  }

  function getProjectRadarCategoryOrder(projectId) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project) return []
    return Array.isArray(project.radarCategoryOrder) ? [...project.radarCategoryOrder] : []
  }

  function setProjectRadarCategoryQuadrants(projectId, categoryQuadrants) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project) return
    // categoryQuadrants is an object: { categoryName: quadrantIndex | null }
    project.radarCategoryQuadrants = { ...categoryQuadrants }
  }

  function getProjectRadarCategoryQuadrants(projectId) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project || !project.radarCategoryQuadrants) return {}
    return { ...project.radarCategoryQuadrants }
  }

  function setProjectRadarQuadrantLabels(projectId, labels) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project) return
    // labels is an object: { quadrantIndex: 'Custom Label' | '' }
    project.radarQuadrantLabels = { ...labels }
  }

  function getProjectRadarQuadrantLabels(projectId) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project || !project.radarQuadrantLabels) return {}
    return { ...project.radarQuadrantLabels }
  }

  function setApplicability(entry, value) {
    if (!applicabilityOptions.includes(value)) {
      entry.applicability = 'applicable'
      return
    }

    entry.applicability = value

    if (['does not apply', 'unknown'].includes(value)) {
      entry.answers = [{ technology: value, status: '', comments: '', answerType: '' }]
    } else {
      const filteredAnswers = (entry.answers || []).filter(
        (answer) => !['does not apply', 'unknown'].includes(answer.technology)
      )
      entry.answers = filteredAnswers.length > 0
        ? filteredAnswers
        : [{ technology: '', status: '', comments: '', answerType: '' }]
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
    workspaceDirNeeded,
    autoSaveEnabled,
    activeQuestionnaire,
    activeCategories,
    openTabs,
    workspaceTabs,
    initFromStorage,
    setWorkspaceDir,
    loadFromData,
    startAutoSave,
    persist,
    persistTo,
    toggleAutoSave,
    newWorkspace,
    closeWorkspace,
    setActiveQuestionnaire,
    setActiveWorkspaceTab,
    openQuestionnaire,
    openProjectSummary,
    closeQuestionnaire,
    closeWorkspaceTab,
    updateQuestionnaireCategories,
    addAnswer,
    deleteAnswer,
    toggleProjectRadarRef,
    isProjectRadarRef,
    getRadarOverride,
    setRadarOverride,
    setProjectRadarCategoryOrder,
    getProjectRadarCategoryOrder,
    setProjectRadarCategoryQuadrants,
    getProjectRadarCategoryQuadrants,
    setProjectRadarQuadrantLabels,
    getProjectRadarQuadrantLabels,
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
    reorderQuestionnaire,
    unassignQuestionnaire,
    assignQuestionnaireToProject,
    getQuestionnaireById,
    getProjectQuestionnaires,
    deleteQuestionnaire,
    renameQuestionnaire,
    saveQuestionnaire,
    saveActiveQuestionnaire,
    exportProject,
    addQuestionnaireFromCategories,
    updateProjectDeviationSettings,
    updateProjectVisibilitySettings,
    setReferenceQuestionnaire,
    activeProjectId,
    pendingNavigation,
    navigateToEntry,
    clearPendingNavigation,
    pendingMenuAction,
    dispatchMenuAction,
    clearMenuAction,
    duplicateProject,
    duplicateQuestionnaire,
    getQuestionnaireHiddenEntries,
    setQuestionnaireHiddenEntries
  }
})
