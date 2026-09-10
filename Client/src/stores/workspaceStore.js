import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { getCategoriesData } from '../services/categoriesService'
import {
  buildStandardCatalogFromSeed,
  buildInterviewCatalog,
  instantiateCatalog,
  createBlankCatalog,
  duplicateCatalogTemplate,
  migrateCategoriesExamplesToTyped
} from '../services/catalogService'
import { validateCatalog } from '../schema/catalogValidation'
import {
  normalize,
  termKeys,
  buildAliasIndex,
  resolve,
  assertNoAliasCollisions,
  TERM_KINDS
} from '../services/vocabulary'
import { ACCEPTANCE_MODES } from '../services/comparison'
import { prepareImportedCatalog } from '../services/catalogImport'
import { createId, createWorkspace, createProject, createQuestionnaire, generateSlugId } from './workspaceFactories'
import { normalizeCategories } from './normalizeCategories'
import {
  migrateProjectRadar,
  normalizeWorkspaceVocabularyFields,
  buildWorkspaceFromLegacyCategoriesFormat,
  migrateWorkspaceToV2,
  migrateWorkspaceToV3
} from './migrations'
import {
  buildSnapshot,
  readFromLocalStorage,
  writeToLocalStorage,
  readFromElectronFile,
  writeToElectronFile,
  writeToElectronFileAt
} from './persistence'

const STORAGE_KEY = 'solution-inventory-data'
const STORAGE_VERSION = 3

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspace = ref(createWorkspace())
  const activeQuestionnaireId = ref('')
  const openQuestionnaireIds = ref([])
  const activeWorkspaceTabId = ref('')
  const openProjectSummaryIds = ref([])
  // The workspace comparison tab is a singleton — there is only one workspace,
  // so an open flag says everything an id list would.
  const comparisonTabOpen = ref(false)
  const openCatalogEditorIds = ref([])
  // Draft state for open catalog editors, keyed by catalog id — session-only
  // (not persisted): { [catalogId]: { draft: Catalog, dirty: boolean } }.
  // Lets an edit survive switching workspace tabs without saving (§5.2).
  const catalogDrafts = reactive({})
  const lastSaved = ref('')
  const autoSaveStarted = ref(false)
  const autoSaveEnabled = ref(true)
  const pendingNavigation = ref(null) // { questionnaireId, categoryId, entryId } | null
  const pendingMenuAction = ref(null) // { action: string, payload?: any } | null
  const workspaceDirNeeded = ref(false)
  const questionnaireHiddenEntries = ref({}) // Record<questionnaireId, string[]>
  // Set when stored data exists but could not be loaded (corrupt file/JSON, or
  // an unrecognized version). Never auto-resolved: seeding or overwriting the
  // unreadable data requires an explicit user action (resolveWorkspaceLoadError).
  const workspaceLoadError = ref(null) // { reason: 'unreadable' | 'unsupported-version', message: string } | null

  const activeQuestionnaire = computed(() => {
    return workspace.value.questionnaires.find((item) => item.id === activeQuestionnaireId.value) || null
  })

  const activeProjectId = computed(() => {
    const tabId = activeWorkspaceTabId.value
    if (!tabId) return ''
    if (isProjectTabId(tabId)) return fromProjectTabId(tabId)
    // questionnaire tab – find the project that owns it
    const project = workspace.value.projects.find((p) => (p.questionnaireIds || []).includes(tabId))
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

  const COMPARISON_TAB_ID = 'workspace:comparison'

  const workspaceTabs = computed(() => {
    // The workspace comparison tab. First in the list because it is about the
    // workspace as a whole, not about one of the things below it.
    const comparisonTabs = comparisonTabOpen.value
      ? [{ id: COMPARISON_TAB_ID, type: 'workspace-comparison', label: 'Comparison' }]
      : []

    const projectTabs = openProjectSummaryIds.value
      .map((projectId) => workspace.value.projects.find((project) => project.id === projectId))
      .filter(Boolean)
      .map((project) => ({
        id: toProjectTabId(project.id),
        type: 'project-summary',
        label: project.name,
        projectId: project.id
      }))

    const catalogEditorTabs = openCatalogEditorIds.value
      .map((catalogId) => catalogDrafts[catalogId] && { catalogId, entry: catalogDrafts[catalogId] })
      .filter(Boolean)
      .map(({ catalogId, entry }) => ({
        id: toCatalogTabId(catalogId),
        type: 'catalog-editor',
        label: entry.draft.name,
        catalogId,
        dirty: entry.dirty
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

    return [...comparisonTabs, ...projectTabs, ...catalogEditorTabs, ...questionnaireTabs]
  })

  // Versions this app can load. Tolerant loading (§3.3.1): any of these are
  // accepted and, if older than STORAGE_VERSION, migrated up in memory —
  // only a version outside this set (or malformed data) is "unsupported"
  // and surfaces workspaceLoadError instead of being silently discarded.
  // Must list EVERY still-loadable version explicitly: bumping STORAGE_VERSION
  // without keeping older entries here would make previously-saved workspaces
  // look "unsupported" and trip the B1 error path (§1.5) on real user data.
  const SUPPORTED_STORAGE_VERSIONS = [1, 2, 3]

  // Runs every add-if-missing migration whose target version is newer than the
  // stored data's, in order. Each step is idempotent, so a v1 payload gets both
  // the v2 (standard catalog + defaultCatalogId) and v3 (interview catalog)
  // additions, a v2 payload gets only v3, and a v3 payload gets none. The steps
  // never run again once the workspace is re-saved at STORAGE_VERSION, so a
  // user's later deletion of a built-in catalog sticks.
  function runWorkspaceMigrations(fromVersion) {
    if (!Array.isArray(workspace.value.catalogs)) workspace.value.catalogs = []
    if (fromVersion < 2) {
      migrateWorkspaceToV2(workspace.value, buildStandardCatalogFromSeed(getCategoriesData()))
    }
    if (fromVersion < 3) {
      migrateWorkspaceToV3(workspace.value, buildInterviewCatalog())
    }
  }

  // Keeps the built-in catalogs' content current for users who have NOT taken
  // ownership of them. Because the v2/v3 migrations only *add* a built-in
  // catalog once (never overwrite it, so edits are never clobbered), a workspace
  // that received an early version of a built-in catalog would otherwise be
  // pinned to that stale content forever. A built-in is treated as "pristine"
  // — and safe to refresh from the current seed — only when the stored copy
  // still carries the shipped baseline `version` (editing via the catalog editor
  // bumps it, see saveCatalogDraft) AND the shipped name (renaming in the library
  // changes it). If either differs, the user has customized it and it is left
  // untouched. Deleted built-ins stay deleted (this only refreshes ones present).
  // Set by refreshBuiltInCatalogs() when it actually rewrites a stale built-in
  // catalog, so initFromStorage can persist the healed content once (autosave
  // is set up only after load, so it would otherwise miss this mutation and the
  // stored file would stay stale until the user's next unrelated edit).
  let builtInsRefreshedThisLoad = false

  function refreshBuiltInCatalogs() {
    const seeds = [buildStandardCatalogFromSeed(getCategoriesData()), buildInterviewCatalog()]
    seeds.forEach((seed) => {
      const stored = (workspace.value.catalogs || []).find((catalog) => catalog.id === seed.id)
      if (!stored) return
      if (stored.version !== seed.version || stored.name !== seed.name) return
      if (JSON.stringify(stored.categories) === JSON.stringify(seed.categories)) return
      stored.categories = seed.categories
      stored.statusOptions = seed.statusOptions
      stored.applicabilityOptions = seed.applicabilityOptions
      stored.description = seed.description
      builtInsRefreshedThisLoad = true
    })
  }

  function applyStoredData(data) {
    builtInsRefreshedThisLoad = false
    if (SUPPORTED_STORAGE_VERSIONS.includes(data.version) && data.workspace) {
      workspace.value = data.workspace
      // Migrate any projects still using the legacy two-array radar format
      ;(workspace.value.projects || []).forEach(migrateProjectRadar)
      // Add the vocabulary/comparison fields if this file predates them. Sits
      // here rather than in runWorkspaceMigrations on purpose — it is version-
      // independent, like migrateProjectRadar above (see the function's comment).
      normalizeWorkspaceVocabularyFields(workspace.value)
      runWorkspaceMigrations(data.version)
      refreshBuiltInCatalogs()
      // Restore open tabs and active state, filtering out IDs that no longer exist
      const existingIds = new Set(data.workspace.questionnaires?.map((q) => q.id) || [])
      const restoredOpen = (data.openQuestionnaireIds || []).filter((id) => existingIds.has(id))
      openQuestionnaireIds.value = restoredOpen
      activeQuestionnaireId.value = existingIds.has(data.activeQuestionnaireId)
        ? data.activeQuestionnaireId
        : restoredOpen[0] || ''
      const existingProjectIds = new Set(data.workspace.projects?.map((p) => p.id) || [])
      openProjectSummaryIds.value = (data.openProjectSummaryIds || []).filter((id) => existingProjectIds.has(id))
      // Absent in files written by builds that predate the comparison tab, and
      // pointless below two projects — either way the tab starts closed.
      comparisonTabOpen.value = data.comparisonTabOpen === true && existingProjectIds.size >= 2
      activeWorkspaceTabId.value = data.activeWorkspaceTabId || activeQuestionnaireId.value
      questionnaireHiddenEntries.value = data.questionnaireHiddenEntries || {}
      hydrateLastSaved(data.timestamp)
      return true
    }
    if (SUPPORTED_STORAGE_VERSIONS.includes(data.version) && data.categories) {
      workspace.value = buildWorkspaceFromLegacyCategoriesFormat(data.categories)
      normalizeWorkspaceVocabularyFields(workspace.value)
      // Oldest bare-categories format predates the catalog concept entirely,
      // so it needs the full v1→current chain.
      runWorkspaceMigrations(1)
      refreshBuiltInCatalogs()
      activeQuestionnaireId.value = ''
      openQuestionnaireIds.value = []
      activeWorkspaceTabId.value = ''
      openProjectSummaryIds.value = []
      comparisonTabOpen.value = false
      questionnaireHiddenEntries.value = {}
      hydrateLastSaved(data.timestamp)
      return true
    }
    return false
  }

  async function initFromStorage() {
    workspaceLoadError.value = null

    // --- Electron: file-based storage ---
    if (window.electronAPI) {
      const dir = await window.electronAPI.getWorkspaceDir()
      if (!dir) {
        workspaceDirNeeded.value = true
        return
      }
      workspaceDirNeeded.value = false
      const result = await readFromElectronFile(window.electronAPI)
      if (!result.success) {
        // No file at all (fresh workspace directory) is the only case that may
        // seed automatically. Any other read failure (permissions, disk error)
        // must not be treated as "no data".
        if (result.notFound) {
          seedWorkspace()
        } else {
          workspaceLoadError.value = {
            reason: 'unreadable',
            message: result.error || 'Workspace data file could not be read.'
          }
        }
        return
      }
      try {
        if (!applyStoredData(result.data)) {
          workspaceLoadError.value = {
            reason: 'unsupported-version',
            message: 'Workspace data was created by a different app version and could not be loaded.'
          }
        } else if (builtInsRefreshedThisLoad) {
          await persist()
        }
      } catch (error) {
        console.error('Error applying stored data:', error)
        workspaceLoadError.value = {
          reason: 'unreadable',
          message: 'Workspace data is corrupted and could not be loaded.'
        }
      }
      return
    }

    // --- Web: localStorage ---
    const result = readFromLocalStorage(STORAGE_KEY)
    if (!result.present) {
      seedWorkspace()
      return
    }
    if (result.corrupt) {
      console.error('Error loading from localStorage:', result.error)
      workspaceLoadError.value = {
        reason: 'unreadable',
        message: 'Stored workspace data is corrupted and could not be loaded.'
      }
      return
    }
    if (!applyStoredData(result.data)) {
      workspaceLoadError.value = {
        reason: 'unsupported-version',
        message: 'Stored workspace data was created by a different app version and could not be loaded.'
      }
    } else if (builtInsRefreshedThisLoad) {
      await persist()
    }
  }

  /**
   * Explicit, user-triggered recovery from a workspaceLoadError: discards the
   * unreadable data in memory and starts a fresh seeded workspace. Never
   * called automatically — the caller must have shown the error to the user
   * first, since this is the point of no silent data loss (see the "B1 fix"
   * block in tests/unit/storageCompat.spec.js).
   */
  function resolveWorkspaceLoadErrorWithFreshWorkspace() {
    if (!workspaceLoadError.value) return
    workspaceLoadError.value = null
    seedWorkspace()
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
    const standardCatalog = buildStandardCatalogFromSeed(getCategoriesData())
    const initialQuestionnaire = instantiateCatalog(standardCatalog, 'Current questionnaire')
    workspace.value = createWorkspace([], [initialQuestionnaire])
    // Both built-in catalogs ship in a fresh library; the first questionnaire
    // is still instantiated from the standard one to preserve existing behavior.
    workspace.value.catalogs = [standardCatalog, buildInterviewCatalog()]
    activeQuestionnaireId.value = ''
    openQuestionnaireIds.value = []
    activeWorkspaceTabId.value = ''
    openProjectSummaryIds.value = []
    comparisonTabOpen.value = false
  }

  let persistDebounceTimer = null

  function startAutoSave() {
    if (autoSaveStarted.value) return
    autoSaveStarted.value = true
    watch(
      () => [
        workspace.value,
        activeQuestionnaireId.value,
        openQuestionnaireIds.value,
        activeWorkspaceTabId.value,
        openProjectSummaryIds.value,
        questionnaireHiddenEntries.value
      ],
      () => {
        if (!autoSaveEnabled.value) return
        clearTimeout(persistDebounceTimer)
        persistDebounceTimer = setTimeout(() => persist(), 1500)
      },
      { deep: true }
    )
  }

  async function persist() {
    // Never write while unreadable stored data is still sitting unresolved —
    // doing so would overwrite it with whatever is currently in memory (e.g.
    // a freshly initialized, empty workspace) and complete the data loss that
    // workspaceLoadError exists to prevent.
    if (workspaceLoadError.value) return
    const snapshot = buildSnapshot({
      version: STORAGE_VERSION,
      appVersion: __APP_VERSION__,
      workspace: workspace.value,
      activeQuestionnaireId: activeQuestionnaireId.value,
      openQuestionnaireIds: openQuestionnaireIds.value,
      activeWorkspaceTabId: activeWorkspaceTabId.value,
      openProjectSummaryIds: openProjectSummaryIds.value,
      comparisonTabOpen: comparisonTabOpen.value,
      questionnaireHiddenEntries: questionnaireHiddenEntries.value
    })

    if (window.electronAPI) {
      try {
        await writeToElectronFile(window.electronAPI, snapshot)
        hydrateLastSaved(snapshot.timestamp)
      } catch (error) {
        console.error('Error saving to file:', error)
      }
    } else {
      try {
        writeToLocalStorage(STORAGE_KEY, snapshot)
        hydrateLastSaved(snapshot.timestamp)
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
    comparisonTabOpen.value = false
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
    const snapshot = buildSnapshot({
      version: STORAGE_VERSION,
      appVersion: __APP_VERSION__,
      workspace: workspace.value,
      activeQuestionnaireId: activeQuestionnaireId.value,
      openQuestionnaireIds: openQuestionnaireIds.value,
      activeWorkspaceTabId: activeWorkspaceTabId.value,
      openProjectSummaryIds: openProjectSummaryIds.value,
      comparisonTabOpen: comparisonTabOpen.value,
      questionnaireHiddenEntries: questionnaireHiddenEntries.value
    })
    try {
      await writeToElectronFileAt(window.electronAPI, dirPath, snapshot)
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

  /**
   * Opens the workspace comparison tab. Refused below two projects — comparing
   * a workspace against itself has no meaning, and the TreeNav entry is disabled
   * for the same reason.
   */
  function openWorkspaceComparison() {
    if ((workspace.value.projects || []).length < 2) return false
    comparisonTabOpen.value = true
    activeWorkspaceTabId.value = COMPARISON_TAB_ID
    return true
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
    if (tabId === COMPARISON_TAB_ID) {
      if (!comparisonTabOpen.value) return
      activeWorkspaceTabId.value = tabId
      return
    }
    if (isProjectTabId(tabId)) {
      const projectId = fromProjectTabId(tabId)
      if (!openProjectSummaryIds.value.includes(projectId)) return
      activeWorkspaceTabId.value = tabId
      return
    }
    if (isCatalogTabId(tabId)) {
      const catalogId = fromCatalogTabId(tabId)
      if (!openCatalogEditorIds.value.includes(catalogId)) return
      activeWorkspaceTabId.value = tabId
      return
    }

    // questionnaire tab
    if (!openQuestionnaireIds.value.includes(tabId)) return
    activeQuestionnaireId.value = tabId
    activeWorkspaceTabId.value = tabId
  }

  // Closes a tab immediately, with no dirty-check — callers that need the
  // "unsaved changes?" guard (§4.5) must check isCatalogDraftDirty() and
  // confirm with the user themselves before calling this (a UI concern, see
  // Workspace.vue).
  function closeWorkspaceTab(tabId) {
    if (!tabId) return

    if (tabId === COMPARISON_TAB_ID) {
      comparisonTabOpen.value = false
      if (activeWorkspaceTabId.value !== tabId) return
      activeWorkspaceTabId.value = workspaceTabs.value[0]?.id || ''
      return
    }

    if (isProjectTabId(tabId)) {
      const projectId = fromProjectTabId(tabId)
      openProjectSummaryIds.value = openProjectSummaryIds.value.filter((id) => id !== projectId)
      if (activeWorkspaceTabId.value !== tabId) return
      const nextTab = workspaceTabs.value[0]
      activeWorkspaceTabId.value = nextTab?.id || ''
      return
    }
    if (isCatalogTabId(tabId)) {
      closeCatalogEditor(fromCatalogTabId(tabId))
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

  function addProject(name, defaultCatalogId = '') {
    const project = {
      ...createProject(name, [], defaultCatalogId),
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
    if (source.radarExportSettings && typeof source.radarExportSettings === 'object') {
      newProject.radarExportSettings = JSON.parse(JSON.stringify(source.radarExportSettings))
    }
    return newProjectId
  }

  function renameProject(projectId, name) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return
    const nextName = String(name || '').trim()
    if (!nextName) return
    project.name = nextName
  }

  function getCatalogById(catalogId) {
    return (workspace.value.catalogs || []).find((catalog) => catalog.id === catalogId) || null
  }

  function addCatalog(name) {
    const catalog = createBlankCatalog(name, getCategoriesData())
    workspace.value.catalogs = [...(workspace.value.catalogs || []), catalog]
    return catalog.id
  }

  function renameCatalog(catalogId, name) {
    const catalog = getCatalogById(catalogId)
    if (!catalog) return
    const nextName = String(name || '').trim()
    if (!nextName) return
    catalog.name = nextName
  }

  function duplicateCatalog(catalogId) {
    const source = getCatalogById(catalogId)
    if (!source) return
    const copy = duplicateCatalogTemplate(source, `${source.name} (Copy)`)
    workspace.value.catalogs = [...(workspace.value.catalogs || []), copy]
    return copy.id
  }

  function getCatalogReferencingProjects(catalogId) {
    return workspace.value.projects.filter((project) => project.defaultCatalogId === catalogId)
  }

  /**
   * Deletes a catalog unless a project still references it as its
   * defaultCatalogId (§4.1). Returns which projects block the deletion so
   * the UI can show them, rather than a bare boolean.
   */
  function deleteCatalog(catalogId) {
    const referencingProjects = getCatalogReferencingProjects(catalogId)
    if (referencingProjects.length > 0) {
      return { ok: false, referencingProjects: referencingProjects.map((project) => project.name) }
    }
    workspace.value.catalogs = (workspace.value.catalogs || []).filter((catalog) => catalog.id !== catalogId)
    return { ok: true }
  }

  function exportCatalog(catalogId) {
    const catalog = getCatalogById(catalogId)
    if (!catalog) return
    const data = JSON.stringify(catalog, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(catalog.name || 'catalog')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // Falls back through: the project's chosen default catalog → the first
  // catalog in the library → a standard catalog built on the fly (should
  // only happen for a workspace whose migration somehow left it catalog-less).
  function resolveDefaultCatalog(projectId) {
    const project = projectId ? workspace.value.projects.find((item) => item.id === projectId) : null
    const preferred = project?.defaultCatalogId ? getCatalogById(project.defaultCatalogId) : null
    return preferred || workspace.value.catalogs?.[0] || buildStandardCatalogFromSeed(getCategoriesData())
  }

  // The reference catalog an imported catalog is compared against: the project's
  // current default catalog (see resolveDefaultCatalog's fallbacks).
  function getProjectDefaultCatalog(projectId) {
    return resolveDefaultCatalog(projectId)
  }

  /**
   * Imports an externally-authored (e.g. AI-generated) catalog and attaches it
   * to a project. Catalogs are global (workspace.catalogs), so "attach to a
   * project" means: add the prepared catalog to the library with a fresh id and
   * point the project's defaultCatalogId at it. Existing questionnaires are
   * instances and are not touched; only new ones use the new catalog.
   * Does not validate — the caller gates on validateCatalog before calling.
   * @returns {{ catalogId: string } | null}
   */
  function importCatalogToProject(projectId, rawCatalog) {
    const project = workspace.value.projects.find((item) => item.id === projectId)
    if (!project) return null
    const prepared = prepareImportedCatalog(rawCatalog, getCategoriesData())
    workspace.value.catalogs = [...(workspace.value.catalogs || []), prepared]
    project.defaultCatalogId = prepared.id
    return { catalogId: prepared.id }
  }

  function addQuestionnaire(name, categories, projectId) {
    const questionnaire = categories
      ? createQuestionnaire(name || 'New questionnaire', normalizeCategories(categories))
      : instantiateCatalog(resolveDefaultCatalog(projectId), name || 'New questionnaire')
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
    if (radarData.radarExportSettings && typeof radarData.radarExportSettings === 'object') {
      project.radarExportSettings = JSON.parse(JSON.stringify(radarData.radarExportSettings))
    }
  }

  function duplicateQuestionnaire(questionnaireId) {
    const source = getQuestionnaireById(questionnaireId)
    if (!source) return
    const copy = createQuestionnaire(`${source.name} (Copy)`, normalizeCategories(source.categories))
    workspace.value.questionnaires.push(copy)
    // Assign to the same project as original, if any
    const project = workspace.value.projects.find((p) => (p.questionnaireIds || []).includes(questionnaireId))
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

  function toCatalogTabId(catalogId) {
    return `catalog:${catalogId}`
  }

  function isCatalogTabId(tabId) {
    return String(tabId || '').startsWith('catalog:')
  }

  function fromCatalogTabId(tabId) {
    return String(tabId || '').slice('catalog:'.length)
  }

  /**
   * Opens a catalog as its own workspace tab (§4.3), creating a session-only
   * edit draft the first time. Re-opening an already-open catalog just
   * switches to its existing tab/draft rather than discarding unsaved edits.
   */
  function openCatalogEditor(catalogId) {
    const catalog = getCatalogById(catalogId)
    if (!catalog) return
    if (!openCatalogEditorIds.value.includes(catalogId)) {
      openCatalogEditorIds.value.push(catalogId)
    }
    if (!catalogDrafts[catalogId]) {
      const draft = JSON.parse(JSON.stringify(catalog))
      // Normalize legacy examples ({label, tools[]}) to the typed
      // {type: 'practice'|'tool', label, description} shape before the
      // dirty-watch below attaches, so opening an unmigrated catalog for
      // viewing never marks it dirty on its own — only an explicit Save
      // persists the normalized shape (see catalogService.js).
      migrateCategoriesExamplesToTyped(draft.categories)
      catalogDrafts[catalogId] = { draft, dirty: false }
      // flush: 'sync' matters here — save/discard replace `.draft` wholesale
      // and then clear `.dirty` in the same synchronous call. With the
      // default (batched) flush timing this watcher would fire *after* that
      // clear and flip dirty back to true. Sync flush makes it fire
      // immediately on the draft reassignment, so the explicit `dirty =
      // false` that follows it in program order is genuinely the last write.
      watch(
        () => catalogDrafts[catalogId]?.draft,
        () => {
          if (catalogDrafts[catalogId]) catalogDrafts[catalogId].dirty = true
        },
        { deep: true, flush: 'sync' }
      )
    }
    activeWorkspaceTabId.value = toCatalogTabId(catalogId)
  }

  function getCatalogDraft(catalogId) {
    return catalogDrafts[catalogId]?.draft || null
  }

  function isCatalogDraftDirty(catalogId) {
    return !!catalogDrafts[catalogId]?.dirty
  }

  /**
   * Validates and persists a catalog draft (§4.5): blocked by errors,
   * allowed with only warnings. On success the draft becomes the new saved
   * baseline (version bumped) and dirty is cleared.
   */
  function saveCatalogDraft(catalogId) {
    const entry = catalogDrafts[catalogId]
    if (!entry) return { ok: false, errors: [{ path: '', message: 'No draft open for this catalog.' }], warnings: [] }
    const { errors, warnings } = validateCatalog(entry.draft)
    if (errors.length > 0) {
      return { ok: false, errors, warnings }
    }
    const saved = JSON.parse(JSON.stringify(entry.draft))
    saved.version = (saved.version || 0) + 1
    const index = workspace.value.catalogs.findIndex((c) => c.id === catalogId)
    if (index !== -1) {
      workspace.value.catalogs.splice(index, 1, saved)
    } else {
      workspace.value.catalogs.push(saved)
    }
    entry.draft = JSON.parse(JSON.stringify(saved))
    entry.dirty = false
    return { ok: true, warnings }
  }

  /** Resets a draft back to the last saved version of its catalog (§4.3 "Rückgängig"). */
  function discardCatalogDraft(catalogId) {
    const catalog = getCatalogById(catalogId)
    const entry = catalogDrafts[catalogId]
    if (!entry || !catalog) return
    entry.draft = JSON.parse(JSON.stringify(catalog))
    entry.dirty = false
  }

  function closeCatalogEditor(catalogId) {
    openCatalogEditorIds.value = openCatalogEditorIds.value.filter((id) => id !== catalogId)
    delete catalogDrafts[catalogId]
    if (activeWorkspaceTabId.value === toCatalogTabId(catalogId)) {
      const nextTab = workspaceTabs.value[0]
      activeWorkspaceTabId.value = nextTab?.id || ''
    }
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
        radarCategoryOrder: Array.isArray(project.radarCategoryOrder) ? project.radarCategoryOrder : [],
        ...(project.radarExportSettings && typeof project.radarExportSettings === 'object'
          ? { radarExportSettings: project.radarExportSettings }
          : {})
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
    const norm = String(option || '')
      .trim()
      .toLowerCase()
    const idx = project.radar.findIndex((r) => r.entryId === entryId && String(r.option || '').toLowerCase() === norm)
    if (idx !== -1) {
      project.radar.splice(idx, 1)
    } else {
      // Populate category, status and shortComment from the questionnaire entry
      let categoryTitle = ''
      let answerStatus = ''
      let answerComments = ''
      const projectQuestionnaires = workspace.value.questionnaires.filter((q) =>
        (project.questionnaireIds || []).includes(q.id)
      )
      const preferred = projectQuestionnaires.find((q) => q.id === questionnaireId)
      const toSearch = preferred
        ? [preferred, ...projectQuestionnaires.filter((q) => q.id !== questionnaireId)]
        : projectQuestionnaires
      for (const q of toSearch) {
        for (const cat of q.categories || []) {
          if (cat.isMetadata) continue
          const entry = (cat.entries || []).find((e) => e.id === entryId)
          if (entry) {
            categoryTitle = String(cat.title || '').trim()
            const answer = (entry.answers || []).find(
              (a) =>
                String(a.technology || '')
                  .trim()
                  .toLowerCase() === norm
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
        description: '',
        link: ''
      })
    }
  }

  function isProjectRadarRef(projectId, entryId, option) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project || !Array.isArray(project.radar)) return false
    const norm = String(option || '')
      .trim()
      .toLowerCase()
    return project.radar.some((r) => r.entryId === entryId && String(r.option || '').toLowerCase() === norm)
  }

  function getRadarOverride(projectId, entryId, option) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project || !Array.isArray(project.radar)) return null
    const norm = String(option || '')
      .trim()
      .toLowerCase()
    return project.radar.find((r) => r.entryId === entryId && String(r.option || '').toLowerCase() === norm) || null
  }

  // ── Comparison overrides ───────────────────────────────────────────────────
  //
  // Manual re-classification of a divergence, keyed by term.id and valid
  // workspace-wide. Because the id survives renaming and merging, so does the
  // override (DE-5).
  //
  // Deliberately NOT setRadarOverride — that one curates a single blip inside
  // one project's radar. This one records a judgement about a term across
  // projects and lives in workspace.comparisonOverrides.

  function comparisonOverrides() {
    if (!workspace.value.comparisonOverrides || typeof workspace.value.comparisonOverrides !== 'object') {
      workspace.value.comparisonOverrides = {}
    }
    return workspace.value.comparisonOverrides
  }

  function getComparisonOverride(termId) {
    return comparisonOverrides()[termId] || null
  }

  /**
   * Records a decision about a term. `context` is the situation it was taken in
   * (which projects, which statuses) so a later divergence cannot hide behind an
   * accepted one — the engine compares it back and flags a changed context.
   *
   * Whether the row is even *allowed* an override is the view's call via
   * canOverride(): the store does not have the comparison in front of it.
   */
  function setComparisonOverride(termId, { level, comment = '', contextProjects = [], contextStatuses = {} }) {
    if (!termId || !['accepted', 'critical'].includes(level)) return false
    comparisonOverrides()[termId] = {
      level,
      comment: String(comment || ''),
      setAt: new Date().toISOString(),
      contextProjects: [...contextProjects],
      contextStatuses: { ...contextStatuses }
    }
    return true
  }

  function clearComparisonOverride(termId) {
    const overrides = comparisonOverrides()
    if (!(termId in overrides)) return false
    delete overrides[termId]
    return true
  }

  // ── Terms marked "not important" (F1) ──────────────────────────────────────
  //
  // Keyed by the comparison *row* key, not by term.id: the mark has to work on
  // a row the vocabulary does not resolve yet, and those have no term to key by.
  // A row key is `term:<id>` or `raw:<normalized name>`, both stable for as long
  // as the row exists.
  //
  // The mark takes the row out of the comparison entirely, including out of the
  // metrics — it is a decision, not a filter. Nothing is deleted, so it can be
  // taken back.

  function comparisonIgnored() {
    if (!workspace.value.comparisonIgnored || typeof workspace.value.comparisonIgnored !== 'object') {
      workspace.value.comparisonIgnored = {}
    }
    return workspace.value.comparisonIgnored
  }

  function setComparisonIgnored(rowKey, { reason = '' } = {}) {
    if (!rowKey) return false
    comparisonIgnored()[rowKey] = { reason: String(reason || ''), setAt: new Date().toISOString() }
    return true
  }

  function clearComparisonIgnored(rowKey) {
    const ignored = comparisonIgnored()
    if (!(rowKey in ignored)) return false
    delete ignored[rowKey]
    return true
  }

  /**
   * Carries the mark from one row key to another — what a merge needs, because
   * the row that was folded away takes its key with it. Keeps an existing mark
   * on the target rather than overwriting it: both rows were held to be
   * unimportant, and the target's own reason is the one that was written about
   * the row that survives.
   */
  function moveComparisonIgnored(fromKey, toKey) {
    const ignored = comparisonIgnored()
    if (!fromKey || !toKey || fromKey === toKey || !(fromKey in ignored)) return false
    if (!(toKey in ignored)) ignored[toKey] = ignored[fromKey]
    delete ignored[fromKey]
    return true
  }

  // ── Silent acceptances (F3) ────────────────────────────────────────────────
  //
  // "This project goes along with what the others say about this term" — either
  // because it has no opinion of its own (mode 'absence') or because it takes
  // another project's status over its own (mode 'status').
  //
  // Keyed by comparison row key *and* project id, for the same reason the
  // "not important" mark is: the decision has to be possible on a row the
  // vocabulary does not resolve yet. The context is stored alongside so the
  // engine can tell when the situation the decision was taken in has moved on.

  function comparisonAcceptances() {
    if (!workspace.value.comparisonAcceptances || typeof workspace.value.comparisonAcceptances !== 'object') {
      workspace.value.comparisonAcceptances = {}
    }
    return workspace.value.comparisonAcceptances
  }

  function setComparisonAcceptance(
    rowKey,
    projectId,
    { mode, acceptedFrom = '', comment = '', contextProjects = [], contextStatuses = {} }
  ) {
    if (!rowKey || !projectId || !ACCEPTANCE_MODES.includes(mode)) return false
    // Accepting a status is accepting *somebody's* status, and not one's own.
    if (mode === 'status' && (!acceptedFrom || acceptedFrom === projectId)) return false

    const all = comparisonAcceptances()
    if (!all[rowKey]) all[rowKey] = {}
    all[rowKey][projectId] = {
      mode,
      acceptedFrom: mode === 'status' ? acceptedFrom : '',
      comment: String(comment || ''),
      setAt: new Date().toISOString(),
      contextProjects: [...contextProjects],
      contextStatuses: { ...contextStatuses }
    }
    return true
  }

  function clearComparisonAcceptance(rowKey, projectId) {
    const all = comparisonAcceptances()
    if (!all[rowKey] || !(projectId in all[rowKey])) return false
    delete all[rowKey][projectId]
    // An empty row entry is noise in the stored file and in every diff of it.
    if (!Object.keys(all[rowKey]).length) delete all[rowKey]
    return true
  }

  /** Carries every acceptance on one row to another row key — what a merge needs. */
  function moveComparisonAcceptances(fromKey, toKey) {
    const all = comparisonAcceptances()
    if (!fromKey || !toKey || fromKey === toKey || !all[fromKey]) return false
    all[toKey] = { ...all[fromKey], ...(all[toKey] || {}) }
    delete all[fromKey]
    return true
  }

  // ── Reference baselines (F7) ───────────────────────────────────────────────
  //
  // A target state pulled out of the matrix and held still, so every project can
  // be measured against it one at a time. Stored as a *copy* of the statuses on
  // purpose: a reference that moved with the projects would be a mirror, not a
  // reference. Kept as a list so several can exist side by side — "where we were
  // in Q2" and "where we want to be" are both useful and neither replaces the
  // other.

  function comparisonBaselines() {
    if (!Array.isArray(workspace.value.comparisonBaselines)) workspace.value.comparisonBaselines = []
    return workspace.value.comparisonBaselines
  }

  function createComparisonBaseline({ name, origin = {}, entries = {} }) {
    const canonical = String(name || '').trim()
    if (!canonical) return ''
    const baseline = {
      id: createId('baseline'),
      name: canonical,
      createdAt: new Date().toISOString(),
      origin: { ...origin },
      entries: { ...entries }
    }
    comparisonBaselines().push(baseline)
    return baseline.id
  }

  function renameComparisonBaseline(baselineId, name) {
    const baseline = comparisonBaselines().find((entry) => entry.id === baselineId)
    const canonical = String(name || '').trim()
    if (!baseline || !canonical) return false
    baseline.name = canonical
    return true
  }

  /** Replaces the held statuses — "take the reference again as things stand now". */
  function updateComparisonBaseline(baselineId, entries, origin = null) {
    const baseline = comparisonBaselines().find((entry) => entry.id === baselineId)
    if (!baseline) return false
    baseline.entries = { ...entries }
    if (origin) baseline.origin = { ...origin }
    baseline.updatedAt = new Date().toISOString()
    return true
  }

  /**
   * Re-keys every reference entry from one row key to another. Needed whenever a
   * row changes identity without changing meaning — a spelling becoming a term,
   * two rows merging. Without it the reference would go on holding a target for
   * a key nothing produces any more, and the row would come back as a phantom
   * gap under its old name.
   */
  function moveComparisonBaselineEntries(fromKey, toKey) {
    if (!fromKey || !toKey || fromKey === toKey) return false
    let moved = false
    for (const baseline of comparisonBaselines()) {
      const entries = baseline.entries || {}
      if (!(fromKey in entries)) continue
      if (!(toKey in entries)) entries[toKey] = entries[fromKey]
      delete entries[fromKey]
      moved = true
    }
    return moved
  }

  function deleteComparisonBaseline(baselineId) {
    const baselines = comparisonBaselines()
    const index = baselines.findIndex((entry) => entry.id === baselineId)
    if (index === -1) return false
    baselines.splice(index, 1)
    return true
  }

  // ── Vocabulary ─────────────────────────────────────────────────────────────
  //
  // The workspace vocabulary is a resolution layer over the free-text answers
  // and radar blips (see src/services/vocabulary.js). These are its only write
  // paths; every one of them keeps the "an alias belongs to at most one term"
  // invariant by validating a *candidate* vocabulary first and only assigning it
  // once it holds. A rejected mutation leaves the workspace exactly as it was.

  function vocabularyList() {
    if (!Array.isArray(workspace.value.vocabulary)) workspace.value.vocabulary = []
    return workspace.value.vocabulary
  }

  // Applies `mutate` to a deep copy and adopts the result only if it is still
  // collision-free. Cheaper to reason about than undoing a partial mutation, and
  // the vocabulary is far too small for the copy to matter.
  function commitVocabulary(mutate) {
    const candidate = JSON.parse(JSON.stringify(vocabularyList()))
    const result = mutate(candidate)
    assertNoAliasCollisions(candidate)
    workspace.value.vocabulary = candidate
    return result
  }

  function findTerm(termId) {
    return vocabularyList().find((term) => term.id === termId) || null
  }

  /**
   * Resolves a raw name (a blip's `option`, an answer's `technology`) against the
   * current vocabulary. Returns the term or null.
   */
  function resolveTerm(rawName) {
    return resolve(rawName, vocabularyList())
  }

  /**
   * Creates a term. `kind` is mandatory and never guessed — design §5.1 makes
   * this the one thing the UI must ask for when answerType cannot supply it.
   * Returns the new term's id, or '' when the name is empty or already taken.
   */
  function createTerm(name, kind) {
    const canonical = String(name || '').trim()
    if (!canonical) return ''
    if (!TERM_KINDS.includes(kind)) return ''
    if (resolveTerm(canonical)) return ''

    const existingIds = vocabularyList().map((term) => term.id)
    const id = `term-${generateSlugId(
      canonical,
      existingIds.map((termId) => termId.replace(/^term-/, ''))
    )}`
    return commitVocabulary((candidate) => {
      candidate.push({
        id,
        name: canonical,
        kind,
        aliases: [],
        note: '',
        createdAt: new Date().toISOString()
      })
      return id
    })
  }

  /**
   * Adds a raw name as an alias of `termId`. No-op when the name already resolves
   * to that same term (the canonical name counts as an implicit alias, so it is
   * never stored twice). Throws AliasCollisionError when the name belongs to a
   * different term — the user has to resolve that, it is not ours to overwrite.
   */
  function addAlias(termId, rawName) {
    const term = findTerm(termId)
    const key = normalize(rawName)
    if (!term || key === '') return false
    if (termKeys(term).includes(key)) return false

    return commitVocabulary((candidate) => {
      const target = candidate.find((entry) => entry.id === termId)
      if (!Array.isArray(target.aliases)) target.aliases = []
      target.aliases.push(key)
      return true
    })
  }

  function removeAlias(termId, rawName) {
    const key = normalize(rawName)
    if (!findTerm(termId) || key === '') return false
    return commitVocabulary((candidate) => {
      const target = candidate.find((entry) => entry.id === termId)
      const aliases = Array.isArray(target.aliases) ? target.aliases : []
      const index = aliases.indexOf(key)
      if (index === -1) return false
      aliases.splice(index, 1)
      target.aliases = aliases
      return true
    })
  }

  /**
   * Renames a term. `id` stays put on purpose (design DE-5): blips resolve
   * through the alias index and overrides are keyed by id, so both survive.
   * The *old* name is kept as an alias — data written under it must keep
   * resolving, which is the whole point of the vocabulary.
   */
  function renameTerm(termId, name) {
    const term = findTerm(termId)
    const canonical = String(name || '').trim()
    if (!term || !canonical) return false
    if (normalize(term.name) === normalize(canonical)) {
      // Same term, only spelling/casing of the display form changes.
      return commitVocabulary((candidate) => {
        candidate.find((entry) => entry.id === termId).name = canonical
        return true
      })
    }
    const owner = resolveTerm(canonical)
    if (owner && owner.id !== termId) return false

    return commitVocabulary((candidate) => {
      const target = candidate.find((entry) => entry.id === termId)
      const previousKey = normalize(target.name)
      if (!Array.isArray(target.aliases)) target.aliases = []
      if (previousKey && !target.aliases.includes(previousKey)) target.aliases.push(previousKey)
      target.name = canonical
      // The new canonical name is an implicit alias; drop any explicit copy.
      target.aliases = target.aliases.filter((alias) => alias !== normalize(canonical))
      return true
    })
  }

  function setTermKind(termId, kind) {
    if (!findTerm(termId) || !TERM_KINDS.includes(kind)) return false
    return commitVocabulary((candidate) => {
      candidate.find((entry) => entry.id === termId).kind = kind
      return true
    })
  }

  function setTermNote(termId, note) {
    if (!findTerm(termId)) return false
    return commitVocabulary((candidate) => {
      candidate.find((entry) => entry.id === termId).note = String(note || '')
      return true
    })
  }

  /**
   * Merges `sourceId` into `targetId`: the source's canonical name and all its
   * aliases become aliases of the target, then the source is deleted. The target
   * keeps its own name and kind — merging is "these spellings mean the same
   * thing", not "adopt the other term's identity".
   *
   * Aborts (returning false) if either term is missing or if source and target
   * are the same. A collision with a *third* term cannot arise from this
   * operation alone, but commitVocabulary still validates, so a workspace that
   * already carried one is not made worse by the merge.
   */
  function mergeTerms(sourceId, targetId) {
    const source = findTerm(sourceId)
    const target = findTerm(targetId)
    if (!source || !target || sourceId === targetId) return false

    const merged = commitVocabulary((candidate) => {
      const mergedInto = candidate.find((entry) => entry.id === targetId)
      const keys = new Set(Array.isArray(mergedInto.aliases) ? mergedInto.aliases : [])
      termKeys(source).forEach((key) => keys.add(key))
      keys.delete(normalize(mergedInto.name))
      mergedInto.aliases = [...keys]
      candidate.splice(
        candidate.findIndex((entry) => entry.id === sourceId),
        1
      )
      return true
    })
    if (merged) mergeComparisonOverrides(sourceId, targetId)
    return merged
  }

  /**
   * Folds the source term's override into the target's. The target's decision
   * wins; the source's comment is appended rather than thrown away, and the
   * result is marked as needing review by clearing the recorded context — a
   * merged judgement was never taken about this combined term (DE-5, §5.1).
   */
  function mergeComparisonOverrides(sourceId, targetId) {
    const overrides = comparisonOverrides()
    const source = overrides[sourceId]
    if (!source) return
    const target = overrides[targetId]
    if (!target) {
      overrides[targetId] = { ...source }
    } else if (source.comment) {
      overrides[targetId] = {
        ...target,
        comment: [target.comment, source.comment].filter(Boolean).join(' — '),
        contextProjects: [],
        contextStatuses: {}
      }
    }
    delete overrides[sourceId]
  }

  /**
   * Deletes a term. Deliberately does not touch comparisonOverrides: an override
   * keyed by a now-missing term is inert, and keeping it means an accidental
   * delete followed by re-creating the same term does not silently lose the
   * user's reasoning.
   */
  function deleteTerm(termId) {
    if (!findTerm(termId)) return false
    return commitVocabulary((candidate) => {
      candidate.splice(
        candidate.findIndex((entry) => entry.id === termId),
        1
      )
      return true
    })
  }

  /**
   * Every collision currently present in the workspace vocabulary. Read-only —
   * the UI uses it to tell the user what to clean up; the write paths above
   * refuse to create one in the first place.
   */
  // ── Dismissed similarity suggestions ───────────────────────────────────────
  //
  // Stored as pairs of normalized names on workspace level, not in the session:
  // a suggestion someone deliberately rejected must not be back on top the next
  // time the comparison tab opens (design §5.1).

  function dismissedSuggestions() {
    if (!Array.isArray(workspace.value.dismissedSuggestions)) workspace.value.dismissedSuggestions = []
    return workspace.value.dismissedSuggestions
  }

  function dismissSuggestion(rawName, termName) {
    const key = [normalize(rawName), normalize(termName)].sort().join('||')
    if (key === '||') return false
    const list = dismissedSuggestions()
    if (list.includes(key)) return false
    list.push(key)
    return true
  }

  function isSuggestionDismissed(rawName, termName) {
    return dismissedSuggestions().includes([normalize(rawName), normalize(termName)].sort().join('||'))
  }

  function vocabularyCollisions() {
    return buildAliasIndex(vocabularyList()).collisions
  }

  function setRadarOverride(
    projectId,
    entryId,
    option,
    { status, comment, shortComment = '', categoryOverride = '', link = '', mandatory = false }
  ) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project) return
    if (!Array.isArray(project.radar)) project.radar = []
    const norm = String(option || '')
      .trim()
      .toLowerCase()
    const idx = project.radar.findIndex((r) => r.entryId === entryId && String(r.option || '').toLowerCase() === norm)
    if (idx !== -1) {
      const existing = project.radar[idx]
      project.radar.splice(idx, 1, {
        ...existing,
        status: String(status || ''),
        shortComment: String(shortComment || ''),
        description: String(comment || ''),
        category: String(categoryOverride || existing.category || ''),
        link: String(link || ''),
        mandatory: mandatory === true
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

  // Persisted configuration of the Custom HTML Export dialog (per project).
  // Holds everything the export dialog can configure: layout, labels, colors,
  // category grouping/order, included statuses, export mode, etc.
  function setProjectRadarExportSettings(projectId, settings) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project) return
    project.radarExportSettings = settings && typeof settings === 'object' ? JSON.parse(JSON.stringify(settings)) : null
  }

  function getProjectRadarExportSettings(projectId) {
    const project = workspace.value.projects.find((p) => p.id === projectId)
    if (!project || !project.radarExportSettings || typeof project.radarExportSettings !== 'object') return null
    return JSON.parse(JSON.stringify(project.radarExportSettings))
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
      entry.answers =
        filteredAnswers.length > 0 ? filteredAnswers : [{ technology: '', status: '', comments: '', answerType: '' }]
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
    comparisonTabOpen,
    COMPARISON_TAB_ID,
    openWorkspaceComparison,
    lastSaved,
    workspaceDirNeeded,
    workspaceLoadError,
    resolveWorkspaceLoadErrorWithFreshWorkspace,
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
    getComparisonOverride,
    setComparisonOverride,
    clearComparisonOverride,
    setComparisonIgnored,
    clearComparisonIgnored,
    moveComparisonIgnored,
    setComparisonAcceptance,
    clearComparisonAcceptance,
    moveComparisonAcceptances,
    createComparisonBaseline,
    renameComparisonBaseline,
    updateComparisonBaseline,
    moveComparisonBaselineEntries,
    deleteComparisonBaseline,
    dismissSuggestion,
    isSuggestionDismissed,
    resolveTerm,
    createTerm,
    addAlias,
    removeAlias,
    renameTerm,
    setTermKind,
    setTermNote,
    mergeTerms,
    deleteTerm,
    vocabularyCollisions,
    setProjectRadarCategoryOrder,
    getProjectRadarCategoryOrder,
    setProjectRadarCategoryQuadrants,
    getProjectRadarCategoryQuadrants,
    setProjectRadarQuadrantLabels,
    getProjectRadarQuadrantLabels,
    setProjectRadarExportSettings,
    getProjectRadarExportSettings,
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
    getCatalogById,
    addCatalog,
    renameCatalog,
    duplicateCatalog,
    deleteCatalog,
    exportCatalog,
    getProjectDefaultCatalog,
    importCatalogToProject,
    openCatalogEditorIds,
    catalogDrafts,
    openCatalogEditor,
    getCatalogDraft,
    isCatalogDraftDirty,
    saveCatalogDraft,
    discardCatalogDraft,
    closeCatalogEditor,
    isCatalogTabId,
    toCatalogTabId,
    fromCatalogTabId,
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
