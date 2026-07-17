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
