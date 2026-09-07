import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'

function seedProjectWithQuestionnaire(store, { entryId = 'arch-hlp', category = 'Architecture' } = {}) {
  const projectId = store.addProject('Project A')
  const questionnaireId = store.addQuestionnaire(
    'Q1',
    [
      {
        id: 'cat-1',
        title: category,
        entries: [
          {
            id: entryId,
            aspect: 'Aspect',
            answers: [{ technology: 'Vue', status: 'Adopt', comments: 'great', answerType: 'Tool' }]
          }
        ]
      }
    ],
    projectId
  )
  return { projectId, questionnaireId }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  delete window.electronAPI
})

describe('workspace/project/questionnaire CRUD', () => {
  it('creates a project with a generated id and empty questionnaire list', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('My Project')
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.name).toBe('My Project')
    expect(project.questionnaireIds).toEqual([])
  })

  it('renames a project, ignoring blank names', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('Old name')
    store.renameProject(projectId, '  New name  ')
    expect(store.workspace.projects[0].name).toBe('New name')

    store.renameProject(projectId, '   ')
    expect(store.workspace.projects[0].name).toBe('New name')
  })

  it('deletes a project without touching other projects', () => {
    const store = useWorkspaceStore()
    const keepId = store.addProject('Keep')
    const removeId = store.addProject('Remove')
    store.deleteProject(removeId)
    expect(store.workspace.projects.map((p) => p.id)).toEqual([keepId])
  })

  it('adds a questionnaire, assigns it to a project and opens it', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const questionnaireId = store.addQuestionnaire('New Q', [], projectId)
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).toContain(questionnaireId)
    expect(store.activeQuestionnaireId).toBe(questionnaireId)
    expect(store.openQuestionnaireIds).toContain(questionnaireId)
  })

  it('addQuestionnaire without explicit categories instantiates the project default catalog', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    // No categories passed (null, like the "+ New Questionnaire" UI flow) —
    // must fall back to instantiating a catalog rather than crashing.
    const questionnaireId = store.addQuestionnaire('From catalog', null, projectId)
    const questionnaire = store.getQuestionnaireById(questionnaireId)

    expect(questionnaire.catalogId).toBeTruthy()
    expect(questionnaire.catalogVersion).toBeTruthy()
    expect(questionnaire.categories.length).toBeGreaterThan(0)

    const nonMetaCategory = questionnaire.categories.find((c) => !c.isMetadata)
    expect(nonMetaCategory.entries[0].applicability).toBe('applicable')
    expect(nonMetaCategory.entries[0].answers).toEqual([{ technology: '', status: '', comments: '' }])
  })

  it('addQuestionnaire prefers the project defaultCatalogId when a matching catalog exists in the library', () => {
    const store = useWorkspaceStore()
    // Seed a workspace the normal way so workspace.catalogs is populated.
    store.loadFromData({
      version: 2,
      workspace: {
        id: 'ws1',
        projects: [],
        questionnaires: [],
        catalogs: [
          {
            id: 'catalog-standard',
            name: 'Standard',
            version: 1,
            schemaVersion: 1,
            categories: [{ id: 'meta', title: 'Metadata', isMetadata: true }]
          },
          {
            id: 'catalog-custom',
            name: 'Custom',
            version: 1,
            schemaVersion: 1,
            categories: [
              { id: 'meta', title: 'Metadata', isMetadata: true },
              { id: 'custom-cat', title: 'Custom Category', entries: [{ id: 'custom-entry', aspect: 'Custom Aspect' }] }
            ]
          }
        ]
      },
      openQuestionnaireIds: [],
      activeQuestionnaireId: '',
      openProjectSummaryIds: [],
      activeWorkspaceTabId: ''
    })
    const projectId = store.addProject('P')
    store.workspace.projects.find((p) => p.id === projectId).defaultCatalogId = 'catalog-custom'

    const questionnaireId = store.addQuestionnaire('From custom catalog', null, projectId)
    const questionnaire = store.getQuestionnaireById(questionnaireId)

    expect(questionnaire.catalogId).toBe('catalog-custom')
    expect(questionnaire.categories.some((c) => c.id === 'custom-cat')).toBe(true)
  })

  it('deleteQuestionnaire removes it from all projects and closes its tab', () => {
    const store = useWorkspaceStore()
    const { projectId, questionnaireId } = seedProjectWithQuestionnaire(store)
    store.deleteQuestionnaire(questionnaireId)
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).not.toContain(questionnaireId)
    expect(store.workspace.questionnaires.find((q) => q.id === questionnaireId)).toBeUndefined()
    expect(store.openQuestionnaireIds).not.toContain(questionnaireId)
  })

  it('duplicateQuestionnaire copies categories and assigns duplicate to the same project', () => {
    const store = useWorkspaceStore()
    const { projectId, questionnaireId } = seedProjectWithQuestionnaire(store)
    const copyId = store.duplicateQuestionnaire(questionnaireId)
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).toContain(copyId)
    const copy = store.getQuestionnaireById(copyId)
    expect(copy.name).toContain('(Copy)')
    expect(copy.categories[0].entries[0].id).toBe('arch-hlp')
    // Must be a deep copy, not a shared reference
    copy.categories[0].title = 'Mutated'
    const original = store.getQuestionnaireById(questionnaireId)
    expect(original.categories[0].title).not.toBe('Mutated')
  })

  it('duplicateProject copies questionnaires and radar data independently', () => {
    const store = useWorkspaceStore()
    const { projectId, questionnaireId } = seedProjectWithQuestionnaire(store)
    store.toggleProjectRadarRef(projectId, 'arch-hlp', 'Vue', questionnaireId)

    const newProjectId = store.duplicateProject(projectId)
    const original = store.workspace.projects.find((p) => p.id === projectId)
    const copy = store.workspace.projects.find((p) => p.id === newProjectId)

    expect(copy.name).toBe(`${original.name} (Copy)`)
    expect(copy.questionnaireIds).toHaveLength(1)
    expect(copy.questionnaireIds[0]).not.toBe(questionnaireId)
    expect(copy.radar).toEqual(original.radar)

    // Radar array must be an independent copy
    copy.radar[0].status = 'Retire'
    expect(original.radar[0].status).not.toBe('Retire')
  })
})

describe('radar custom-export settings persistence', () => {
  it('stores and returns a deep copy of the export settings per project', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const settings = { exportMode: 'json', gridColumns: 4, labels: { mandatory: 'Pflicht' } }

    store.setProjectRadarExportSettings(projectId, settings)
    const back = store.getProjectRadarExportSettings(projectId)

    expect(back).toEqual(settings)
    // Returned object must be an independent copy, not the stored reference
    back.gridColumns = 99
    expect(store.getProjectRadarExportSettings(projectId).gridColumns).toBe(4)
    // Mutating the caller's original must not leak into the store either
    settings.labels.mandatory = 'changed'
    expect(store.getProjectRadarExportSettings(projectId).labels.mandatory).toBe('Pflicht')
  })

  it('returns null when nothing is saved and clears on null', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    expect(store.getProjectRadarExportSettings(projectId)).toBeNull()

    store.setProjectRadarExportSettings(projectId, { gridColumns: 2 })
    expect(store.getProjectRadarExportSettings(projectId)).not.toBeNull()

    store.setProjectRadarExportSettings(projectId, null)
    expect(store.getProjectRadarExportSettings(projectId)).toBeNull()
  })

  it('duplicateProject copies export settings independently', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    store.setProjectRadarExportSettings(projectId, { gridColumns: 5, statusColors: { adopt: '#000' } })

    const copyId = store.duplicateProject(projectId)
    const copy = store.getProjectRadarExportSettings(copyId)
    expect(copy).toEqual({ gridColumns: 5, statusColors: { adopt: '#000' } })

    // Editing the copy must not affect the original
    store.setProjectRadarExportSettings(copyId, { gridColumns: 1 })
    expect(store.getProjectRadarExportSettings(projectId).gridColumns).toBe(5)
  })
})

describe('catalog CRUD', () => {
  it('addCatalog creates a catalog with a metadata-only category and a generated id', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    const catalog = store.getCatalogById(catalogId)
    expect(catalog.name).toBe('Backend Assessment')
    expect(catalog.version).toBe(1)
    expect(catalog.categories).toHaveLength(1)
    expect(catalog.categories[0].isMetadata).toBe(true)
  })

  it('addProject stores the chosen defaultCatalogId', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    const projectId = store.addProject('Payments', catalogId)
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.defaultCatalogId).toBe(catalogId)
  })

  it('renameCatalog renames, ignoring blank names', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Old name')
    store.renameCatalog(catalogId, '  New name  ')
    expect(store.getCatalogById(catalogId).name).toBe('New name')
    store.renameCatalog(catalogId, '   ')
    expect(store.getCatalogById(catalogId).name).toBe('New name')
  })

  it('duplicateCatalog creates an independent copy with a new id and reset version', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Original')
    const original = store.getCatalogById(catalogId)
    original.version = 3

    const copyId = store.duplicateCatalog(catalogId)
    const copy = store.getCatalogById(copyId)

    expect(copyId).not.toBe(catalogId)
    expect(copy.name).toBe('Original (Copy)')
    expect(copy.version).toBe(1)

    // Structure must be an independent deep copy, not a shared reference.
    copy.categories[0].title = 'Mutated'
    expect(original.categories[0].title).not.toBe('Mutated')
  })

  it('deleteCatalog removes an unreferenced catalog', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Unused')
    const result = store.deleteCatalog(catalogId)
    expect(result).toEqual({ ok: true })
    expect(store.getCatalogById(catalogId)).toBeNull()
  })

  it('deleteCatalog refuses to delete a catalog referenced by a project as its defaultCatalogId', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('In use')
    store.addProject('Payments', catalogId)

    const result = store.deleteCatalog(catalogId)

    expect(result.ok).toBe(false)
    expect(result.referencingProjects).toEqual(['Payments'])
    expect(store.getCatalogById(catalogId)).not.toBeNull()
  })
})

describe('catalog editor drafts', () => {
  it('openCatalogEditor opens a tab and creates a draft that mirrors the saved catalog', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')

    store.openCatalogEditor(catalogId)

    expect(store.openCatalogEditorIds).toEqual([catalogId])
    expect(store.activeWorkspaceTabId).toBe(store.toCatalogTabId(catalogId))
    const draft = store.getCatalogDraft(catalogId)
    expect(draft.name).toBe('Backend Assessment')
    expect(store.isCatalogDraftDirty(catalogId)).toBe(false)
  })

  it('openCatalogEditor normalizes legacy examples in the draft without marking it dirty', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Legacy Examples Catalog')
    const catalog = store.getCatalogById(catalogId)
    catalog.categories.push({
      id: 'legacy-cat',
      title: 'Legacy',
      entries: [{ id: 'e1', aspect: 'A', examples: [{ label: 'HTTP', description: 'x', tools: ['REST APIs'] }] }]
    })

    store.openCatalogEditor(catalogId)

    const draft = store.getCatalogDraft(catalogId)
    expect(draft.categories.find((c) => c.id === 'legacy-cat').entries[0].examples).toEqual([
      { type: 'practice', label: 'HTTP', description: 'x' },
      { type: 'tool', label: 'REST APIs', description: '' }
    ])
    // The stored catalog itself is untouched — normalization only affects
    // the session-only draft, and only an explicit Save persists it.
    expect(catalog.categories.find((c) => c.id === 'legacy-cat').entries[0].examples).toEqual([
      { label: 'HTTP', description: 'x', tools: ['REST APIs'] }
    ])
    expect(store.isCatalogDraftDirty(catalogId)).toBe(false)
  })

  it('re-opening an already-open catalog keeps the existing draft (does not discard edits)', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    store.openCatalogEditor(catalogId)
    store.getCatalogDraft(catalogId).name = 'Edited name'

    store.openCatalogEditor(catalogId)

    expect(store.getCatalogDraft(catalogId).name).toBe('Edited name')
  })

  it('mutating the draft marks it dirty', async () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    store.openCatalogEditor(catalogId)
    expect(store.isCatalogDraftDirty(catalogId)).toBe(false)

    store.getCatalogDraft(catalogId).name = 'Renamed'
    await nextTick()

    expect(store.isCatalogDraftDirty(catalogId)).toBe(true)
  })

  it('saveCatalogDraft blocks on validation errors and leaves the saved catalog untouched', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    store.openCatalogEditor(catalogId)
    const draft = store.getCatalogDraft(catalogId)
    draft.categories.push({ id: draft.categories[0].id, title: 'Duplicate id category', entries: [] })

    const result = store.saveCatalogDraft(catalogId)

    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(store.getCatalogById(catalogId).categories).toHaveLength(1)
  })

  it('saveCatalogDraft persists the draft, bumps version and clears dirty', async () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    store.openCatalogEditor(catalogId)
    store.getCatalogDraft(catalogId).name = 'Renamed'
    await nextTick()

    const result = store.saveCatalogDraft(catalogId)

    expect(result.ok).toBe(true)
    expect(store.getCatalogById(catalogId).name).toBe('Renamed')
    expect(store.getCatalogById(catalogId).version).toBe(2)
    expect(store.isCatalogDraftDirty(catalogId)).toBe(false)
  })

  it('discardCatalogDraft resets the draft back to the last saved catalog', async () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    store.openCatalogEditor(catalogId)
    store.getCatalogDraft(catalogId).name = 'Renamed'
    await nextTick()

    store.discardCatalogDraft(catalogId)

    expect(store.getCatalogDraft(catalogId).name).toBe('Backend Assessment')
    expect(store.isCatalogDraftDirty(catalogId)).toBe(false)
  })

  it('closeCatalogEditor removes the tab and the draft', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    store.openCatalogEditor(catalogId)

    store.closeCatalogEditor(catalogId)

    expect(store.openCatalogEditorIds).toEqual([])
    expect(store.getCatalogDraft(catalogId)).toBeNull()
  })

  it('workspaceTabs includes open catalog editors with their draft name and dirty flag', async () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    store.openCatalogEditor(catalogId)

    const tab = store.workspaceTabs.find((t) => t.type === 'catalog-editor')
    expect(tab).toMatchObject({ catalogId, label: 'Backend Assessment', dirty: false })

    store.getCatalogDraft(catalogId).name = 'Renamed'
    await nextTick()
    const dirtyTab = store.workspaceTabs.find((t) => t.type === 'catalog-editor')
    expect(dirtyTab.dirty).toBe(true)
  })

  it('setActiveWorkspaceTab and closeWorkspaceTab handle catalog tabs', () => {
    const store = useWorkspaceStore()
    const catalogId = store.addCatalog('Backend Assessment')
    store.openCatalogEditor(catalogId)
    const tabId = store.toCatalogTabId(catalogId)

    store.setActiveWorkspaceTab('not-a-real-tab')
    expect(store.activeWorkspaceTabId).toBe(tabId) // unknown tab id is ignored

    store.closeWorkspaceTab(tabId)
    expect(store.openCatalogEditorIds).toEqual([])
  })
})

describe('moveQuestionnaire / reorderQuestionnaire / assignment', () => {
  it('moves a questionnaire between projects', () => {
    const store = useWorkspaceStore()
    const projectA = store.addProject('A')
    const projectB = store.addProject('B')
    const qId = store.addQuestionnaire('Q', [], projectA)

    store.moveQuestionnaire(projectA, projectB, qId)

    const a = store.workspace.projects.find((p) => p.id === projectA)
    const b = store.workspace.projects.find((p) => p.id === projectB)
    expect(a.questionnaireIds).not.toContain(qId)
    expect(b.questionnaireIds).toContain(qId)
  })

  it('is a no-op when moving within the same project', () => {
    const store = useWorkspaceStore()
    const projectA = store.addProject('A')
    const qId = store.addQuestionnaire('Q', [], projectA)
    store.moveQuestionnaire(projectA, projectA, qId)
    const a = store.workspace.projects.find((p) => p.id === projectA)
    expect(a.questionnaireIds).toEqual([qId])
  })

  it('reorders questionnaires within a project, inserting before a target id', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('A')
    const q1 = store.addQuestionnaire('Q1', [], projectId)
    const q2 = store.addQuestionnaire('Q2', [], projectId)
    const q3 = store.addQuestionnaire('Q3', [], projectId)

    // Move q3 before q1 => [q3, q1, q2]
    store.reorderQuestionnaire(projectId, q3, q1)
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).toEqual([q3, q1, q2])
  })

  it('reorderQuestionnaire with no beforeId appends to the end', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('A')
    const q1 = store.addQuestionnaire('Q1', [], projectId)
    const q2 = store.addQuestionnaire('Q2', [], projectId)
    store.reorderQuestionnaire(projectId, q1, null)
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).toEqual([q2, q1])
  })

  it('unassignQuestionnaire removes it from every project (making it standalone)', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('A')
    const qId = store.addQuestionnaire('Q', [], projectId)
    store.unassignQuestionnaire(qId)
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).not.toContain(qId)
    expect(store.getQuestionnaireById(qId)).toBeTruthy()
  })

  it('assignQuestionnaireToProject does not create duplicate entries', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('A')
    const qId = store.addQuestionnaire('Q', [], projectId)
    store.assignQuestionnaireToProject(projectId, qId)
    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.questionnaireIds).toEqual([qId])
  })
})

describe('tab id helpers', () => {
  // toProjectTabId/isProjectTabId/fromProjectTabId aren't exposed on the store's
  // public API, so their `project:` prefix convention is validated indirectly
  // through the tab-management functions that rely on it.
  it('prefixes a project-summary tab id with "project:" via openProjectSummary', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    store.openProjectSummary(projectId)
    expect(store.activeWorkspaceTabId).toBe(`project:${projectId}`)
  })
})

describe('tab / navigation management', () => {
  it('openQuestionnaire opens exactly once even if called repeatedly', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const qId = store.addQuestionnaire('Q', [], projectId)
    store.openQuestionnaire(qId)
    store.openQuestionnaire(qId)
    expect(store.openQuestionnaireIds.filter((id) => id === qId)).toHaveLength(1)
  })

  it('closeQuestionnaire falls back to another open tab when closing the active one', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const q1 = store.addQuestionnaire('Q1', [], projectId)
    const q2 = store.addQuestionnaire('Q2', [], projectId)
    store.openQuestionnaire(q1)
    store.setActiveQuestionnaire(q2)
    store.closeQuestionnaire(q2)
    expect(store.activeQuestionnaireId).toBe(q1)
  })

  it('closeWorkspaceTab on a project-summary tab activates the next remaining tab', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    store.openProjectSummary(projectId)
    const qId = store.addQuestionnaire('Q', [], projectId)
    store.openQuestionnaire(qId)
    store.setActiveWorkspaceTab(`project:${projectId}`)
    store.closeWorkspaceTab(`project:${projectId}`)
    expect(store.activeWorkspaceTabId).toBe(qId)
  })

  it('navigateToEntry opens the questionnaire and records pending navigation', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const qId = store.addQuestionnaire('Q', [], projectId)
    store.navigateToEntry(qId, 'cat-1', 'entry-1')
    expect(store.openQuestionnaireIds).toContain(qId)
    expect(store.pendingNavigation).toEqual({ questionnaireId: qId, categoryId: 'cat-1', entryId: 'entry-1' })
    store.clearPendingNavigation()
    expect(store.pendingNavigation).toBeNull()
  })
})

describe('radar reference toggling', () => {
  it('toggleProjectRadarRef adds a ref populated from the matching questionnaire answer', () => {
    const store = useWorkspaceStore()
    const { projectId, questionnaireId } = seedProjectWithQuestionnaire(store)

    store.toggleProjectRadarRef(projectId, 'arch-hlp', 'Vue', questionnaireId)

    expect(store.isProjectRadarRef(projectId, 'arch-hlp', 'Vue')).toBe(true)
    const override = store.getRadarOverride(projectId, 'arch-hlp', 'Vue')
    expect(override.category).toBe('Architecture')
    expect(override.status).toBe('Adopt')
    expect(override.shortComment).toBe('great')
  })

  it('toggleProjectRadarRef removes an existing ref (toggle off)', () => {
    const store = useWorkspaceStore()
    const { projectId, questionnaireId } = seedProjectWithQuestionnaire(store)
    store.toggleProjectRadarRef(projectId, 'arch-hlp', 'Vue', questionnaireId)
    store.toggleProjectRadarRef(projectId, 'arch-hlp', 'Vue', questionnaireId)
    expect(store.isProjectRadarRef(projectId, 'arch-hlp', 'Vue')).toBe(false)
  })

  it('toggling is case-insensitive on the option name', () => {
    const store = useWorkspaceStore()
    const { projectId, questionnaireId } = seedProjectWithQuestionnaire(store)
    store.toggleProjectRadarRef(projectId, 'arch-hlp', 'vue', questionnaireId)
    expect(store.isProjectRadarRef(projectId, 'arch-hlp', 'VUE')).toBe(true)
  })

  it('setRadarOverride updates status/comment/category on an existing ref only', () => {
    const store = useWorkspaceStore()
    const { projectId, questionnaireId } = seedProjectWithQuestionnaire(store)
    store.toggleProjectRadarRef(projectId, 'arch-hlp', 'Vue', questionnaireId)

    store.setRadarOverride(projectId, 'arch-hlp', 'Vue', {
      status: 'Retire',
      comment: 'deprecated',
      shortComment: 'old',
      categoryOverride: 'Legacy',
      link: 'example.com',
      mandatory: true
    })

    const override = store.getRadarOverride(projectId, 'arch-hlp', 'Vue')
    expect(override.status).toBe('Retire')
    expect(override.description).toBe('deprecated')
    expect(override.category).toBe('Legacy')
    expect(override.mandatory).toBe(true)
  })

  it('setRadarOverride is a no-op when no ref exists yet', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    store.setRadarOverride(projectId, 'missing', 'X', { status: 'Retire' })
    expect(store.getRadarOverride(projectId, 'missing', 'X')).toBeNull()
  })
})

describe('legacy radar migration (via loadFromData)', () => {
  it('migrates radarRefs + radarOverrides into a unified radar array and drops legacy fields', () => {
    const store = useWorkspaceStore()
    const legacyProject = {
      id: 'project-legacy',
      name: 'Legacy',
      questionnaireIds: [],
      radarRefs: [{ entryId: 'e1', option: 'Vue' }],
      radarOverrides: [
        { entryId: 'e1', option: 'vue', status: 'Trial', shortComment: 'sc', comment: 'desc', link: 'https://x' }
      ]
    }
    const ok = store.loadFromData({
      version: 1,
      workspace: { id: 'ws1', projects: [legacyProject], questionnaires: [] },
      openQuestionnaireIds: [],
      activeQuestionnaireId: '',
      openProjectSummaryIds: [],
      activeWorkspaceTabId: ''
    })
    expect(ok).toBe(true)
    const migrated = store.workspace.projects.find((p) => p.id === 'project-legacy')
    expect(migrated.radarRefs).toBeUndefined()
    expect(migrated.radarOverrides).toBeUndefined()
    expect(migrated.radar).toEqual([
      {
        entryId: 'e1',
        option: 'Vue',
        category: '',
        status: 'Trial',
        shortComment: 'sc',
        description: 'desc',
        link: 'https://x'
      }
    ])
  })

  it('importProject migrates legacy radar data supplied at import time', () => {
    const store = useWorkspaceStore()
    store.importProject('Imported', [{ name: 'Q1', categories: [] }], {
      radarRefs: [{ entryId: 'e1', option: 'React' }],
      radarOverrides: [{ entryId: 'e1', option: 'react', status: 'Hold' }]
    })
    const project = store.workspace.projects.find((p) => p.name === 'Imported')
    expect(project.radar).toEqual([
      {
        entryId: 'e1',
        option: 'React',
        category: '',
        status: 'Hold',
        shortComment: '',
        description: '',
        link: ''
      }
    ])
  })

  it('leaves an already-migrated radar array untouched', () => {
    const store = useWorkspaceStore()
    const project = {
      id: 'p1',
      name: 'P',
      questionnaireIds: [],
      radar: [{ entryId: 'e1', option: 'Vue', status: 'Adopt' }]
    }
    store.loadFromData({
      version: 1,
      workspace: { id: 'ws1', projects: [project], questionnaires: [] },
      openQuestionnaireIds: [],
      activeQuestionnaireId: '',
      openProjectSummaryIds: [],
      activeWorkspaceTabId: ''
    })
    const loaded = store.workspace.projects.find((p) => p.id === 'p1')
    expect(loaded.radar).toEqual([{ entryId: 'e1', option: 'Vue', status: 'Adopt' }])
  })
})

describe('answers / applicability', () => {
  it('addAnswer appends a blank answer to an applicable entry', () => {
    const store = useWorkspaceStore()
    store.addQuestionnaire(
      'Q',
      [
        {
          id: 'cat',
          title: 'Cat',
          entries: [{ id: 'e1', aspect: 'A', answers: [{ technology: '', status: '', comments: '' }] }]
        }
      ],
      store.addProject('P')
    )
    store.addAnswer('e1')
    const entry = store.activeCategories[0].entries[0]
    expect(entry.answers).toHaveLength(2)
  })

  it('addAnswer is a no-op when the entry is not applicable', () => {
    const store = useWorkspaceStore()
    store.addQuestionnaire(
      'Q',
      [
        {
          id: 'cat',
          title: 'Cat',
          entries: [
            {
              id: 'e1',
              aspect: 'A',
              applicability: 'not applicable',
              answers: [{ technology: 'not applicable', status: '', comments: '' }]
            }
          ]
        }
      ],
      store.addProject('P')
    )
    store.addAnswer('e1')
    const entry = store.activeCategories[0].entries[0]
    expect(entry.answers).toHaveLength(1)
  })

  it('deleteAnswer refuses to remove the last remaining answer', () => {
    const store = useWorkspaceStore()
    store.addQuestionnaire(
      'Q',
      [
        {
          id: 'cat',
          title: 'Cat',
          entries: [{ id: 'e1', aspect: 'A', answers: [{ technology: '', status: '', comments: '' }] }]
        }
      ],
      store.addProject('P')
    )
    store.deleteAnswer('e1', 0)
    expect(store.activeCategories[0].entries[0].answers).toHaveLength(1)
  })

  it('setApplicability("unknown") collapses answers to a single sentinel answer', () => {
    const store = useWorkspaceStore()
    store.addQuestionnaire(
      'Q',
      [
        {
          id: 'cat',
          title: 'Cat',
          entries: [{ id: 'e1', aspect: 'A', answers: [{ technology: 'X', status: 'Adopt', comments: '' }] }]
        }
      ],
      store.addProject('P')
    )
    const entry = store.activeCategories[0].entries[0]
    store.setApplicability(entry, 'unknown')
    expect(entry.applicability).toBe('unknown')
    expect(entry.answers).toEqual([{ technology: 'unknown', status: '', comments: '', answerType: '' }])
  })

  // KNOWN BUG (characterized, not endorsed): applicabilityOptions contains 'not applicable',
  // but the collapse-sentinel checks in setApplicability/normalizeCategories test for the
  // string 'does not apply', which is never a valid applicability value. As a result,
  // marking an entry "not applicable" does NOT clear its existing free-form answers -
  // it only re-filters out answers already literally named 'does not apply' or 'unknown'.
  // This test locks in the CURRENT behavior so refactors don't change it silently;
  // fixing the underlying string mismatch is a product decision, not this test's job.
  it('setApplicability("not applicable") currently leaves existing free-form answers untouched (see comment above)', () => {
    const store = useWorkspaceStore()
    store.addQuestionnaire(
      'Q',
      [
        {
          id: 'cat',
          title: 'Cat',
          entries: [{ id: 'e1', aspect: 'A', answers: [{ technology: 'X', status: 'Adopt', comments: '' }] }]
        }
      ],
      store.addProject('P')
    )
    const entry = store.activeCategories[0].entries[0]
    store.setApplicability(entry, 'not applicable')
    expect(entry.applicability).toBe('not applicable')
    expect(entry.answers).toEqual([{ technology: 'X', status: 'Adopt', comments: '' }])
  })

  it('setApplicability back to "applicable" restores a blank answer when none remain', () => {
    const store = useWorkspaceStore()
    store.addQuestionnaire(
      'Q',
      [
        {
          id: 'cat',
          title: 'Cat',
          entries: [{ id: 'e1', aspect: 'A', answers: [{ technology: 'X', status: 'Adopt', comments: '' }] }]
        }
      ],
      store.addProject('P')
    )
    const entry = store.activeCategories[0].entries[0]
    store.setApplicability(entry, 'unknown')
    store.setApplicability(entry, 'applicable')
    expect(entry.answers).toEqual([{ technology: '', status: '', comments: '', answerType: '' }])
  })

  it('setApplicability falls back to "applicable" for unrecognised values', () => {
    const store = useWorkspaceStore()
    store.addQuestionnaire(
      'Q',
      [
        {
          id: 'cat',
          title: 'Cat',
          entries: [{ id: 'e1', aspect: 'A', answers: [{ technology: '', status: '', comments: '' }] }]
        }
      ],
      store.addProject('P')
    )
    const entry = store.activeCategories[0].entries[0]
    store.setApplicability(entry, 'bogus-value')
    expect(entry.applicability).toBe('applicable')
  })
})

describe('normalizeCategories (via addQuestionnaire)', () => {
  it('defaults missing applicability to "applicable" and seeds a blank answer', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('P')
    const qId = store.addQuestionnaire(
      'Q',
      [{ id: 'cat', title: 'Cat', entries: [{ id: 'e1', aspect: 'A' }] }],
      projectId
    )
    const q = store.getQuestionnaireById(qId)
    expect(q.categories[0].entries[0].applicability).toBe('applicable')
    expect(q.categories[0].entries[0].answers).toEqual([{ technology: '', status: '', comments: '' }])
  })

  it('deep-clones input categories so mutating the questionnaire cannot affect caller data', () => {
    const store = useWorkspaceStore()
    const source = [
      {
        id: 'cat',
        title: 'Cat',
        entries: [{ id: 'e1', aspect: 'A', answers: [{ technology: '', status: '', comments: '' }] }]
      }
    ]
    const qId = store.addQuestionnaire('Q', source, store.addProject('P'))
    store.getQuestionnaireById(qId).categories[0].title = 'Changed'
    expect(source[0].title).toBe('Cat')
  })
})

describe('getExampleItems', () => {
  it('normalizes array-of-object examples and appends tools to the description', () => {
    const store = useWorkspaceStore()
    const items = store.getExampleItems([{ label: 'Layered', description: 'Some desc.', tools: ['A', 'B'] }])
    expect(items).toEqual([{ label: 'Layered', description: 'Some desc (A, B).' }])
  })

  it('leaves the description unchanged when no tools array is present', () => {
    const store = useWorkspaceStore()
    const items = store.getExampleItems([{ label: 'X', description: 'desc' }])
    expect(items).toEqual([{ label: 'X', description: 'desc' }])
  })

  it('parses comma-separated string examples', () => {
    const store = useWorkspaceStore()
    const items = store.getExampleItems('A, B ,C')
    expect(items).toEqual([
      { label: 'A', description: '' },
      { label: 'B', description: '' },
      { label: 'C', description: '' }
    ])
  })

  it('returns an empty array for falsy input', () => {
    const store = useWorkspaceStore()
    expect(store.getExampleItems(null)).toEqual([])
    expect(store.getExampleItems(undefined)).toEqual([])
  })
})

describe('renderTextWithLinks', () => {
  it('converts markdown-style links to anchors and escapes surrounding HTML', () => {
    const store = useWorkspaceStore()
    const html = store.renderTextWithLinks('See [docs](https://example.com/<x>) for <b>info</b>')
    expect(html).toContain('<a href="https://example.com/&lt;x&gt;" target="_blank" rel="noopener noreferrer">docs</a>')
    expect(html).toContain('&lt;b&gt;info&lt;/b&gt;')
  })

  it('auto-links bare URLs', () => {
    const store = useWorkspaceStore()
    const html = store.renderTextWithLinks('Visit https://example.com now')
    expect(html).toBe(
      'Visit <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a> now'
    )
  })

  it('returns an empty string for falsy input', () => {
    const store = useWorkspaceStore()
    expect(store.renderTextWithLinks('')).toBe('')
    expect(store.renderTextWithLinks(null)).toBe('')
  })
})

describe('getStatusTooltip', () => {
  it('resolves the description for a known status label', () => {
    const store = useWorkspaceStore()
    expect(store.getStatusTooltip('Adopt')).toBe('We use this and recommend it.')
  })

  it('returns an empty string for an unknown status', () => {
    const store = useWorkspaceStore()
    expect(store.getStatusTooltip('Bogus')).toBe('')
  })
})

describe('persistence round-trip (localStorage)', () => {
  it('persist() writes to localStorage and a fresh store restores it via initFromStorage()', async () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('Persisted project')
    await store.persist()

    expect(localStorage.getItem('solution-inventory-data')).toBeTruthy()

    setActivePinia(createPinia())
    const restored = useWorkspaceStore()
    await restored.initFromStorage()

    expect(restored.workspace.projects.some((p) => p.id === projectId)).toBe(true)
  })

  it('initFromStorage seeds a fresh workspace when localStorage is empty', async () => {
    const store = useWorkspaceStore()
    await store.initFromStorage()
    expect(store.workspace.questionnaires).toHaveLength(1)
    expect(store.workspace.projects).toHaveLength(0)
  })

  it('a freshly seeded workspace ships both built-in catalogs, with the first questionnaire from the standard one', async () => {
    const store = useWorkspaceStore()
    await store.initFromStorage()

    expect(store.workspace.catalogs.map((c) => c.id)).toEqual(['catalog-standard', 'catalog-interview'])
    // The auto-created first questionnaire is still instantiated from the
    // standard catalog (unchanged behavior) — the interview catalog is offered
    // in the library, not auto-instantiated.
    const questionnaire = store.workspace.questionnaires[0]
    expect(questionnaire.categories.length).toBeGreaterThan(0)
  })

  it('initFromStorage does NOT seed over invalid JSON — it surfaces workspaceLoadError instead (see storageCompat.spec.js for the full B1 fix coverage)', async () => {
    localStorage.setItem('solution-inventory-data', '{not valid json')
    const store = useWorkspaceStore()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await store.initFromStorage()
    expect(store.workspaceLoadError).toEqual(expect.objectContaining({ reason: 'unreadable' }))
    expect(store.workspace.questionnaires).toHaveLength(0)
    spy.mockRestore()
  })
})

describe('importCatalogToProject', () => {
  const rawCatalog = {
    id: 'source-id',
    name: 'AI Catalog',
    categories: [
      { id: 'context', title: 'Context', isMetadata: true },
      { id: 'architecture', title: 'Architecture', entries: [{ id: 'arch-1', aspect: 'Style' }] }
    ]
  }

  it('adds the catalog to the library with a fresh id and sets it as the project default', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('Project A')
    const before = (store.workspace.catalogs || []).length

    const result = store.importCatalogToProject(projectId, rawCatalog)

    expect(result.catalogId).toBeTruthy()
    expect(result.catalogId).not.toBe('source-id')
    expect(store.workspace.catalogs.length).toBe(before + 1)

    const project = store.workspace.projects.find((p) => p.id === projectId)
    expect(project.defaultCatalogId).toBe(result.catalogId)

    const imported = store.getCatalogById(result.catalogId)
    expect(imported.name).toBe('AI Catalog')
  })

  it('returns null for an unknown project and does not add a catalog', () => {
    const store = useWorkspaceStore()
    const before = (store.workspace.catalogs || []).length
    const result = store.importCatalogToProject('does-not-exist', rawCatalog)
    expect(result).toBeNull()
    expect((store.workspace.catalogs || []).length).toBe(before)
  })

  it('exposes the project default catalog for comparison', () => {
    const store = useWorkspaceStore()
    const projectId = store.addProject('Project B')
    const result = store.importCatalogToProject(projectId, rawCatalog)
    const reference = store.getProjectDefaultCatalog(projectId)
    expect(reference.id).toBe(result.catalogId)
  })
})

// ── Vocabulary mutations (design §3.1) ───────────────────────────────────────
//
// These are the only write paths into workspace.vocabulary. Each one must keep
// the "an alias belongs to at most one term" invariant, and a rejected mutation
// must leave the workspace exactly as it was — no half-applied change.
describe('vocabulary mutations', () => {
  describe('createTerm', () => {
    it('creates a term with a readable id, the canonical name and an empty alias list', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')

      expect(id).toBe('term-net-core')
      expect(store.workspace.vocabulary).toHaveLength(1)
      const term = store.workspace.vocabulary[0]
      expect(term.name).toBe('.NET Core')
      expect(term.kind).toBe('tool')
      expect(term.aliases).toEqual([])
      expect(term.createdAt).toBeTruthy()
    })

    it('trims the name but keeps its canonical casing', () => {
      const store = useWorkspaceStore()
      store.createTerm('  Azure DevOps  ', 'practice')

      expect(store.workspace.vocabulary[0].name).toBe('Azure DevOps')
    })

    it('refuses an empty name', () => {
      const store = useWorkspaceStore()

      expect(store.createTerm('', 'tool')).toBe('')
      expect(store.createTerm('   ', 'tool')).toBe('')
      expect(store.workspace.vocabulary).toEqual([])
    })

    it('refuses a missing or unknown kind — kind is mandatory and never guessed', () => {
      const store = useWorkspaceStore()

      expect(store.createTerm('Redis', '')).toBe('')
      expect(store.createTerm('Redis', 'Tool')).toBe('')
      expect(store.createTerm('Redis', 'framework')).toBe('')
      expect(store.workspace.vocabulary).toEqual([])
    })

    it('refuses a name that already resolves — by canonical name or by alias', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')
      store.addAlias(id, 'dotnet core')

      expect(store.createTerm('.net  CORE', 'tool')).toBe('')
      expect(store.createTerm('Dotnet Core', 'practice')).toBe('')
      expect(store.workspace.vocabulary).toHaveLength(1)
    })

    it('disambiguates ids when two different names slugify to the same base', () => {
      const store = useWorkspaceStore()
      const first = store.createTerm('.NET Core', 'tool')
      const second = store.createTerm('#NET Core', 'tool')

      expect(first).toBe('term-net-core')
      expect(second).toBe('term-net-core-2')
    })
  })

  describe('addAlias / removeAlias', () => {
    it('stores an alias normalized', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')

      expect(store.addAlias(id, '  Dotnet   CORE ')).toBe(true)
      expect(store.workspace.vocabulary[0].aliases).toEqual(['dotnet core'])
      expect(store.resolveTerm('DOTNET core').id).toBe(id)
    })

    it('does not store the canonical name a second time — it is an implicit alias', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')

      expect(store.addAlias(id, '.net core')).toBe(false)
      expect(store.workspace.vocabulary[0].aliases).toEqual([])
    })

    it('does not store the same alias twice', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')
      store.addAlias(id, 'netcore')

      expect(store.addAlias(id, 'NETCORE')).toBe(false)
      expect(store.workspace.vocabulary[0].aliases).toEqual(['netcore'])
    })

    it('refuses an empty alias or an unknown term', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('Redis', 'tool')

      expect(store.addAlias(id, '   ')).toBe(false)
      expect(store.addAlias('term-nope', 'x')).toBe(false)
      expect(store.workspace.vocabulary[0].aliases).toEqual([])
    })

    it('throws when the alias already belongs to a different term, leaving both untouched', () => {
      const store = useWorkspaceStore()
      const core = store.createTerm('.NET Core', 'tool')
      const framework = store.createTerm('.NET Framework', 'tool')
      store.addAlias(framework, 'netfx')

      expect(() => store.addAlias(core, 'netfx')).toThrow(/alias collision/)
      expect(store.workspace.vocabulary.find((term) => term.id === core).aliases).toEqual([])
      expect(store.workspace.vocabulary.find((term) => term.id === framework).aliases).toEqual(['netfx'])
    })

    it('throws when the alias is another term’s canonical name', () => {
      const store = useWorkspaceStore()
      const core = store.createTerm('.NET Core', 'tool')
      store.createTerm('Redis', 'tool')

      expect(() => store.addAlias(core, 'redis')).toThrow(/alias collision/)
      expect(store.resolveTerm('Redis').name).toBe('Redis')
    })

    it('removes an alias regardless of how it is spelled at the call site', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')
      store.addAlias(id, 'netcore')

      expect(store.removeAlias(id, ' NetCore ')).toBe(true)
      expect(store.workspace.vocabulary[0].aliases).toEqual([])
      expect(store.resolveTerm('netcore')).toBeNull()
    })

    it('returns false when removing an alias the term does not have', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('Redis', 'tool')

      expect(store.removeAlias(id, 'nope')).toBe(false)
    })
  })

  describe('renameTerm', () => {
    it('keeps the id stable and turns the old name into an alias', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')

      expect(store.renameTerm(id, '.NET')).toBe(true)
      const term = store.workspace.vocabulary[0]
      expect(term.id).toBe(id)
      expect(term.name).toBe('.NET')
      // Data written under the old name must keep resolving.
      expect(store.resolveTerm('.NET Core').id).toBe(id)
      expect(store.resolveTerm('.NET').id).toBe(id)
    })

    it('changes only the display form when the normalized name stays the same', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('dotnet core', 'tool')

      expect(store.renameTerm(id, 'Dotnet Core')).toBe(true)
      expect(store.workspace.vocabulary[0].name).toBe('Dotnet Core')
      expect(store.workspace.vocabulary[0].aliases).toEqual([])
    })

    it('does not keep the new canonical name as an explicit alias as well', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')
      store.addAlias(id, 'dotnet')

      store.renameTerm(id, 'Dotnet')
      expect(store.workspace.vocabulary[0].aliases).toEqual(['.net core'])
    })

    it('refuses an empty name, an unknown term, and a name owned by another term', () => {
      const store = useWorkspaceStore()
      const core = store.createTerm('.NET Core', 'tool')
      store.createTerm('Redis', 'tool')

      expect(store.renameTerm(core, '  ')).toBe(false)
      expect(store.renameTerm('term-nope', 'X')).toBe(false)
      expect(store.renameTerm(core, 'redis')).toBe(false)
      expect(store.workspace.vocabulary.find((term) => term.id === core).name).toBe('.NET Core')
    })
  })

  describe('setTermKind / setTermNote', () => {
    it('changes the kind', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('Trunk Based Development', 'tool')

      expect(store.setTermKind(id, 'practice')).toBe(true)
      expect(store.workspace.vocabulary[0].kind).toBe('practice')
    })

    it('refuses an unknown kind or an unknown term', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('Redis', 'tool')

      expect(store.setTermKind(id, 'Practice')).toBe(false)
      expect(store.setTermKind('term-nope', 'practice')).toBe(false)
      expect(store.workspace.vocabulary[0].kind).toBe('tool')
    })

    it('stores a note', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')

      expect(store.setTermNote(id, 'Ab Version 5 als .NET geführt.')).toBe(true)
      expect(store.workspace.vocabulary[0].note).toBe('Ab Version 5 als .NET geführt.')
    })
  })

  describe('mergeTerms', () => {
    it('moves the source name and all its aliases onto the target and deletes the source', () => {
      const store = useWorkspaceStore()
      const target = store.createTerm('.NET Core', 'tool')
      const source = store.createTerm('Dotnet Core', 'tool')
      store.addAlias(source, 'netcore')

      expect(store.mergeTerms(source, target)).toBe(true)
      expect(store.workspace.vocabulary).toHaveLength(1)
      const merged = store.workspace.vocabulary[0]
      expect(merged.id).toBe(target)
      expect(merged.name).toBe('.NET Core')
      expect(merged.aliases.sort()).toEqual(['dotnet core', 'netcore'])
    })

    it('makes every former spelling resolve to the target', () => {
      const store = useWorkspaceStore()
      const target = store.createTerm('.NET Core', 'tool')
      const source = store.createTerm('Dotnet Core', 'tool')

      store.mergeTerms(source, target)
      expect(store.resolveTerm('dotnet core').id).toBe(target)
      expect(store.resolveTerm('.NET Core').id).toBe(target)
    })

    it('keeps the target’s own kind — merging is not adopting the other identity', () => {
      const store = useWorkspaceStore()
      const target = store.createTerm('Pair Programming', 'practice')
      const source = store.createTerm('Pairing', 'tool')

      store.mergeTerms(source, target)
      expect(store.workspace.vocabulary[0].kind).toBe('practice')
    })

    it('does not leave the target’s own name in its alias list', () => {
      const store = useWorkspaceStore()
      // A redundant self-alias is not a collision (termKeys deduplicates), so it
      // can legitimately arrive from imported or hand-edited data.
      store.workspace.vocabulary = [
        { id: 'term-redis', name: 'Redis', kind: 'tool', aliases: ['redis'] },
        { id: 'term-redis-cache', name: 'Redis Cache', kind: 'tool', aliases: [] }
      ]

      expect(store.mergeTerms('term-redis-cache', 'term-redis')).toBe(true)
      expect(store.workspace.vocabulary[0].aliases).toEqual(['redis cache'])
    })

    it('aborts and changes nothing when the result would collide with a third term', () => {
      const store = useWorkspaceStore()
      // Reachable only from stored data that already carries a collision — the
      // store's own write paths refuse to create one. commitVocabulary validates
      // regardless, so a merge cannot make such a workspace worse.
      store.workspace.vocabulary = [
        { id: 'term-a', name: 'A', kind: 'tool', aliases: [] },
        { id: 'term-b', name: 'B', kind: 'tool', aliases: ['shared'] },
        { id: 'term-c', name: 'C', kind: 'tool', aliases: ['shared'] }
      ]
      const before = JSON.parse(JSON.stringify(store.workspace.vocabulary))

      expect(() => store.mergeTerms('term-b', 'term-a')).toThrow(/alias collision/)
      expect(store.workspace.vocabulary).toEqual(before)
    })

    it('refuses an unknown term and a merge of a term into itself', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('Redis', 'tool')

      expect(store.mergeTerms(id, id)).toBe(false)
      expect(store.mergeTerms('term-nope', id)).toBe(false)
      expect(store.mergeTerms(id, 'term-nope')).toBe(false)
      expect(store.workspace.vocabulary).toHaveLength(1)
    })
  })

  describe('deleteTerm', () => {
    it('removes the term and stops resolving its names', () => {
      const store = useWorkspaceStore()
      const id = store.createTerm('.NET Core', 'tool')
      store.addAlias(id, 'netcore')

      expect(store.deleteTerm(id)).toBe(true)
      expect(store.workspace.vocabulary).toEqual([])
      expect(store.resolveTerm('netcore')).toBeNull()
    })

    it('returns false for an unknown term', () => {
      const store = useWorkspaceStore()

      expect(store.deleteTerm('term-nope')).toBe(false)
    })
  })

  describe('resolveTerm and vocabularyCollisions', () => {
    it('resolves nothing on a fresh workspace and reports no collisions', () => {
      const store = useWorkspaceStore()

      expect(store.workspace.vocabulary).toEqual([])
      expect(store.resolveTerm('Redis')).toBeNull()
      expect(store.vocabularyCollisions()).toEqual([])
    })

    it('reports a collision that came in with stored data, without refusing to load it', () => {
      const store = useWorkspaceStore()
      store.workspace.vocabulary = [
        { id: 'term-a', name: 'A', kind: 'tool', aliases: ['x'] },
        { id: 'term-b', name: 'B', kind: 'tool', aliases: ['x'] }
      ]

      expect(store.vocabularyCollisions()).toEqual([{ key: 'x', termId: 'term-a', conflictingTermId: 'term-b' }])
      // First claimant wins on the read path, so the workspace stays usable.
      expect(store.resolveTerm('x').id).toBe('term-a')
    })
  })

  it('persists the vocabulary through a save/load round trip', async () => {
    const store = useWorkspaceStore()
    const id = store.createTerm('.NET Core', 'tool')
    store.addAlias(id, 'dotnet core')
    await store.persist()

    setActivePinia(createPinia())
    const reloaded = useWorkspaceStore()
    await reloaded.initFromStorage()

    expect(reloaded.resolveTerm('DOTNET CORE').id).toBe(id)
    expect(reloaded.workspace.vocabulary[0].name).toBe('.NET Core')
  })
})

// ── Comparison overrides (Todo 3.8) ──────────────────────────────────────────
//
// Keyed by term.id and stored inside `workspace`, so the passthrough argument
// from design §7.1 applies and no STORAGE_VERSION bump is needed. Not to be
// confused with setRadarOverride, which curates a single blip in one project.
describe('comparison overrides', () => {
  it('stores a decision with its comment and the context it was taken in', () => {
    const store = useWorkspaceStore()
    const termId = store.createTerm('Azure DevOps', 'tool')

    expect(
      store.setComparisonOverride(termId, {
        level: 'accepted',
        comment: 'Legacy service, migration is commissioned',
        contextProjects: ['p1', 'p2'],
        contextStatuses: { p1: 'Trial', p2: 'Hold' }
      })
    ).toBe(true)

    const stored = store.getComparisonOverride(termId)
    expect(stored).toMatchObject({
      level: 'accepted',
      comment: 'Legacy service, migration is commissioned',
      contextProjects: ['p1', 'p2'],
      contextStatuses: { p1: 'Trial', p2: 'Hold' }
    })
    expect(stored.setAt).toBeTruthy()
  })

  it('refuses an unknown level and an empty term id', () => {
    const store = useWorkspaceStore()

    expect(store.setComparisonOverride('term-x', { level: 'maybe' })).toBe(false)
    expect(store.setComparisonOverride('', { level: 'accepted' })).toBe(false)
    expect(store.workspace.comparisonOverrides).toEqual({})
  })

  it('returns null for a term without an override', () => {
    const store = useWorkspaceStore()

    expect(store.getComparisonOverride('term-nope')).toBeNull()
  })

  it('clears an override, and reports when there was none', () => {
    const store = useWorkspaceStore()
    store.setComparisonOverride('term-x', { level: 'critical' })

    expect(store.clearComparisonOverride('term-x')).toBe(true)
    expect(store.getComparisonOverride('term-x')).toBeNull()
    expect(store.clearComparisonOverride('term-x')).toBe(false)
  })

  it('survives renaming the term, because it is keyed by id (DE-5)', () => {
    const store = useWorkspaceStore()
    const termId = store.createTerm('Azure DevOps', 'tool')
    store.setComparisonOverride(termId, { level: 'accepted' })

    store.renameTerm(termId, 'Azure Pipelines')
    expect(store.getComparisonOverride(termId).level).toBe('accepted')
  })

  it('survives merging another spelling into the term', () => {
    const store = useWorkspaceStore()
    const target = store.createTerm('Azure DevOps', 'tool')
    const source = store.createTerm('AzureDevops Server', 'tool')
    store.setComparisonOverride(target, { level: 'accepted' })

    store.mergeTerms(source, target)
    expect(store.getComparisonOverride(target).level).toBe('accepted')
  })

  it('is kept when the term is deleted — an accidental delete must not lose the reasoning', () => {
    const store = useWorkspaceStore()
    const termId = store.createTerm('Azure DevOps', 'tool')
    store.setComparisonOverride(termId, { level: 'accepted', comment: 'why' })

    store.deleteTerm(termId)
    expect(store.getComparisonOverride(termId).comment).toBe('why')
  })

  it('is not the same thing as setRadarOverride', () => {
    const store = useWorkspaceStore()
    const { projectId, questionnaireId } = seedProjectWithQuestionnaire(store)
    store.toggleProjectRadarRef(projectId, 'arch-hlp', 'Vue', questionnaireId)
    store.setRadarOverride(projectId, 'arch-hlp', 'Vue', { status: 'Retire', comment: '' })
    store.setComparisonOverride('term-vue', { level: 'accepted' })

    expect(store.getRadarOverride(projectId, 'arch-hlp', 'Vue').status).toBe('Retire')
    expect(store.getComparisonOverride('term-vue').level).toBe('accepted')
    expect(store.workspace.comparisonOverrides).toEqual({ 'term-vue': expect.objectContaining({ level: 'accepted' }) })
  })

  it('persists through a save/load round trip', async () => {
    const store = useWorkspaceStore()
    store.setComparisonOverride('term-x', { level: 'critical', comment: 'must be resolved' })
    await store.persist()

    setActivePinia(createPinia())
    const reloaded = useWorkspaceStore()
    await reloaded.initFromStorage()

    expect(reloaded.getComparisonOverride('term-x')).toMatchObject({ level: 'critical', comment: 'must be resolved' })
  })
})

// ── Workspace comparison tab (Todo 4.2) ──────────────────────────────────────
describe('workspace comparison tab', () => {
  function twoProjects(store) {
    store.addProject('Alpha')
    store.addProject('Beta')
  }

  it('is closed on a fresh workspace', () => {
    const store = useWorkspaceStore()

    expect(store.comparisonTabOpen).toBe(false)
    expect(store.workspaceTabs.some((tab) => tab.type === 'workspace-comparison')).toBe(false)
  })

  it('refuses to open below two projects', () => {
    const store = useWorkspaceStore()
    store.addProject('Only one')

    expect(store.openWorkspaceComparison()).toBe(false)
    expect(store.comparisonTabOpen).toBe(false)
  })

  it('opens as the first tab and becomes active', () => {
    const store = useWorkspaceStore()
    twoProjects(store)

    expect(store.openWorkspaceComparison()).toBe(true)
    expect(store.workspaceTabs[0]).toMatchObject({ type: 'workspace-comparison', label: 'Comparison' })
    expect(store.activeWorkspaceTabId).toBe(store.COMPARISON_TAB_ID)
  })

  it('opens only once however often it is triggered', () => {
    const store = useWorkspaceStore()
    twoProjects(store)
    store.openWorkspaceComparison()
    store.openWorkspaceComparison()

    expect(store.workspaceTabs.filter((tab) => tab.type === 'workspace-comparison')).toHaveLength(1)
  })

  it('closes and hands the active tab on to whatever is left', () => {
    const store = useWorkspaceStore()
    twoProjects(store)
    const projectId = store.workspace.projects[0].id
    store.openProjectSummary(projectId)
    store.openWorkspaceComparison()

    store.closeWorkspaceTab(store.COMPARISON_TAB_ID)
    expect(store.comparisonTabOpen).toBe(false)
    expect(store.activeWorkspaceTabId).not.toBe(store.COMPARISON_TAB_ID)
    expect(store.workspaceTabs.some((tab) => tab.type === 'project-summary')).toBe(true)
  })

  it('cannot be activated while it is closed', () => {
    const store = useWorkspaceStore()
    twoProjects(store)
    store.setActiveWorkspaceTab(store.COMPARISON_TAB_ID)

    expect(store.activeWorkspaceTabId).not.toBe(store.COMPARISON_TAB_ID)
  })

  it('persists its open state at save-data level, outside the workspace object', async () => {
    const store = useWorkspaceStore()
    twoProjects(store)
    store.openWorkspaceComparison()
    await store.persist()

    const stored = JSON.parse(localStorage.getItem('solution-inventory-data'))
    expect(stored.comparisonTabOpen).toBe(true)
    // Deliberately *not* inside `workspace`: applyStoredData passes the
    // workspace through whole, and an older build should not carry along the
    // open state of a tab it cannot render (design §7.1).
    expect('comparisonTabOpen' in stored.workspace).toBe(false)
    expect(stored.version).toBe(3)
  })

  it('restores its open state on load', async () => {
    const store = useWorkspaceStore()
    twoProjects(store)
    store.openWorkspaceComparison()
    await store.persist()

    setActivePinia(createPinia())
    const reloaded = useWorkspaceStore()
    await reloaded.initFromStorage()

    expect(reloaded.comparisonTabOpen).toBe(true)
  })

  it('stays closed when loading a file written before the tab existed', async () => {
    const store = useWorkspaceStore()
    twoProjects(store)
    await store.persist()
    const stored = JSON.parse(localStorage.getItem('solution-inventory-data'))
    delete stored.comparisonTabOpen
    localStorage.setItem('solution-inventory-data', JSON.stringify(stored))

    setActivePinia(createPinia())
    const reloaded = useWorkspaceStore()
    await reloaded.initFromStorage()

    expect(reloaded.comparisonTabOpen).toBe(false)
  })

  it('stays closed when the stored workspace has dropped below two projects', async () => {
    const store = useWorkspaceStore()
    twoProjects(store)
    store.openWorkspaceComparison()
    await store.persist()
    const stored = JSON.parse(localStorage.getItem('solution-inventory-data'))
    stored.workspace.projects = stored.workspace.projects.slice(0, 1)
    localStorage.setItem('solution-inventory-data', JSON.stringify(stored))

    setActivePinia(createPinia())
    const reloaded = useWorkspaceStore()
    await reloaded.initFromStorage()

    expect(reloaded.comparisonTabOpen).toBe(false)
  })
})
