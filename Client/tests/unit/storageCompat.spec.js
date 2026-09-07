// Golden-Master compatibility tests.
//
// The fixtures under tests/data/storage/ are frozen contracts: real shapes of
// data written to disk/localStorage by earlier app versions. They must never be
// edited to make a test pass — only new versions may be added alongside them.
//
// These tests currently characterize the *actual* behavior of the load path
// (bugs included, see the "Known bug — B1" block) so that Phase 1 refactorings
// (persistence/migration extraction, catalog introduction) have a safety net
// that fails loudly if backward compatibility regresses.

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { buildInterviewCatalog } from '../../src/services/catalogService'
import v1WorkspaceFull from '../data/storage/v1-workspace-full.json'
import v1WorkspaceLegacyRadar from '../data/storage/v1-workspace-legacy-radar.json'
import v1CategoriesOnly from '../data/storage/v1-categories-only.json'
import v3WorkspaceRadar from '../data/storage/v3-workspace-radar.json'
import pkg from '../../package.json'

// Builds a v3 payload whose stored interview catalog is an intentionally stale,
// pristine (unedited, version 1, unrenamed) copy — the exact situation of a
// workspace that received an early version of the built-in catalog before its
// content grew.
function v3PayloadWithStaleInterviewCatalog(overrides = {}) {
  return {
    version: 3,
    workspace: {
      id: 'ws1',
      projects: [],
      questionnaires: [],
      catalogs: [
        {
          id: 'catalog-standard',
          name: 'Standard Catalog',
          version: 1,
          schemaVersion: 1,
          categories: [{ id: 'meta', title: 'Metadata', isMetadata: true }]
        },
        {
          id: 'catalog-interview',
          name: 'Software System Interview',
          version: 1,
          schemaVersion: 1,
          // Only two categories — far fewer than the current shipped seed.
          categories: [
            { id: 'context', title: 'System Context', isMetadata: true },
            { id: 'domain', title: 'Business & Domain Context', entries: [{ id: 'x', aspect: 'X' }] }
          ],
          ...overrides
        }
      ]
    }
  }
}

const STORAGE_KEY = 'solution-inventory-data'

// loadFromData()/applyStoredData() assign fixture sub-objects onto the store
// by reference (no deep clone). Cloning here keeps the imported JSON fixtures
// pristine across tests instead of accidentally mutating the shared module cache.
function clone(fixture) {
  return JSON.parse(JSON.stringify(fixture))
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  delete window.electronAPI
})

describe('storage compatibility (Golden Master)', () => {
  describe('v1-workspace-full.json — full persist() payload', () => {
    it('loads every stored field without data loss', () => {
      const store = useWorkspaceStore()
      const ok = store.loadFromData(clone(v1WorkspaceFull))
      expect(ok).toBe(true)

      const project = store.workspace.projects.find((p) => p.id === 'project-p1')
      expect(project.name).toBe('Payment Platform')
      expect(project.questionnaireIds).toEqual(['questionnaire-q1'])
      expect(project.radar).toEqual(v1WorkspaceFull.workspace.projects[0].radar)
      expect(project.radarCategoryOrder).toEqual(['Architecture', 'Frontend'])
      expect(project.radarCategoryQuadrants).toEqual({ Architecture: 0, Frontend: 1 })
      expect(project.radarQuadrantLabels).toEqual({ 0: 'Techniques', 1: 'Tools' })
      expect(project.deviationSettings).toEqual({ enabled: true })
      expect(project.visibilitySettings).toEqual({ showHidden: false })
      expect(project.referenceQuestionnaireId).toBe('questionnaire-q1')

      const questionnaire = store.getQuestionnaireById('questionnaire-q1')
      expect(questionnaire.name).toBe('Payment Platform Assessment')

      const metaCategory = questionnaire.categories.find((c) => c.isMetadata)
      expect(metaCategory.metadata.productName).toBe('PayFlow')
      expect(metaCategory.metadata.architecturalRole).toBe('Domain Service / Microservice')
      expect(metaCategory.metadataOptions.executionType).toHaveLength(2)

      const archCategory = questionnaire.categories.find((c) => c.id === 'architecture')
      const hlpEntry = archCategory.entries.find((e) => e.id === 'arch-hlp')
      expect(hlpEntry.answers).toEqual([
        { technology: 'Clean Arch', status: 'Adopt', comments: 'Works well', answerType: 'Tool', isRadarRef: true }
      ])
      expect(hlpEntry.applicability).toBe('applicable')
      expect(hlpEntry.entryComment).toBe('Reviewed 2026-05')

      const stateEntry = archCategory.entries.find((e) => e.id === 'arch-state')
      expect(stateEntry.appliesTo).toEqual({ architecturalRole: ['Domain Service / Microservice'] })
      expect(stateEntry.applicability).toBe('unknown')

      expect(store.getQuestionnaireHiddenEntries('questionnaire-q1')).toEqual(new Set(['arch-state']))

      expect(store.activeQuestionnaireId).toBe('questionnaire-q1')
      expect(store.openQuestionnaireIds).toEqual(['questionnaire-q1'])
      expect(store.activeWorkspaceTabId).toBe('questionnaire-q1')
      expect(store.openProjectSummaryIds).toEqual(['project-p1'])
    })

    it('is idempotent — loading the same payload twice yields the same state', () => {
      const store = useWorkspaceStore()
      store.loadFromData(clone(v1WorkspaceFull))
      const first = JSON.parse(JSON.stringify(store.workspace))

      store.loadFromData(clone(v1WorkspaceFull))
      const second = JSON.parse(JSON.stringify(store.workspace))

      expect(second).toEqual(first)
    })

    it('round-trips through persist() and a fresh store reload without data loss', async () => {
      const store = useWorkspaceStore()
      store.loadFromData(clone(v1WorkspaceFull))
      await store.persist()

      setActivePinia(createPinia())
      const restored = useWorkspaceStore()
      await restored.initFromStorage()

      const project = restored.workspace.projects.find((p) => p.id === 'project-p1')
      expect(project.radar).toEqual(v1WorkspaceFull.workspace.projects[0].radar)

      const questionnaire = restored.getQuestionnaireById('questionnaire-q1')
      const archCategory = questionnaire.categories.find((c) => c.id === 'architecture')
      expect(archCategory.entries.find((e) => e.id === 'arch-hlp').answers[0].technology).toBe('Clean Arch')
      expect(restored.getQuestionnaireHiddenEntries('questionnaire-q1')).toEqual(new Set(['arch-state']))
    })
  })

  describe('v1-workspace-legacy-radar.json — radarRefs/radarOverrides format', () => {
    it('migrates legacy radar fields into the unified radar array on load', () => {
      const store = useWorkspaceStore()
      const ok = store.loadFromData(clone(v1WorkspaceLegacyRadar))
      expect(ok).toBe(true)

      const project = store.workspace.projects.find((p) => p.id === 'project-legacy1')
      expect(project.radarRefs).toBeUndefined()
      expect(project.radarOverrides).toBeUndefined()
      expect(project.radar).toEqual([
        {
          entryId: 'arch-hlp',
          option: 'Layered',
          category: 'Architecture',
          status: 'Trial',
          shortComment: 'short note',
          description: 'long note describing the migration path',
          link: 'https://legacy.example.com'
        }
      ])

      const questionnaire = store.getQuestionnaireById('questionnaire-legacy1')
      const entry = questionnaire.categories[0].entries[0]
      expect(entry.answers[0]).toEqual(
        expect.objectContaining({ technology: 'Layered', status: 'Trial', comments: 'note' })
      )
    })
  })

  describe('v1-categories-only.json — oldest storage format (pre-workspace)', () => {
    it('loads into a single default questionnaire without losing answers', () => {
      const store = useWorkspaceStore()
      const ok = store.loadFromData(clone(v1CategoriesOnly))
      expect(ok).toBe(true)

      expect(store.workspace.questionnaires).toHaveLength(1)
      const questionnaire = store.workspace.questionnaires[0]
      expect(questionnaire.name).toBe('Current questionnaire')

      const metaCategory = questionnaire.categories.find((c) => c.isMetadata)
      expect(metaCategory.metadata.productName).toBe('Old App')

      const archCategory = questionnaire.categories.find((c) => c.id === 'architecture')
      expect(archCategory.entries[0].answers[0]).toEqual(
        expect.objectContaining({ technology: 'Monolith', status: 'Adopt' })
      )
    })
  })

  describe('catalog migration (see the STORAGE_VERSION history in src/stores/migrations.js)', () => {
    it('loading a v1 payload adds both built-in catalogs and stamps defaultCatalogId on projects, without touching existing data', () => {
      const store = useWorkspaceStore()
      const ok = store.loadFromData(clone(v1WorkspaceFull))
      expect(ok).toBe(true)

      // v1 predates the catalog concept entirely, so it runs the full chain:
      // v2 adds the standard catalog, v3 adds the interview catalog.
      expect(store.workspace.catalogs.map((c) => c.id)).toEqual(['catalog-standard', 'catalog-interview'])

      const project = store.workspace.projects.find((p) => p.id === 'project-p1')
      // defaultCatalogId is set by the v2 step and stays the standard catalog —
      // the interview catalog is offered in the library, not forced as default.
      expect(project.defaultCatalogId).toBe('catalog-standard')

      // Existing questionnaires are left as pure legacy instances — no
      // fabricated catalogId provenance for structure the app never
      // actually validated against a catalog (spec §7 point 6).
      const questionnaire = store.getQuestionnaireById('questionnaire-q1')
      expect(questionnaire.catalogId).toBeUndefined()

      // The questionnaire's own structure/answers are untouched by the migration.
      const archCategory = questionnaire.categories.find((c) => c.id === 'architecture')
      expect(archCategory.entries.find((e) => e.id === 'arch-hlp').answers[0].technology).toBe('Clean Arch')
    })

    it('is idempotent — loading the same v1 payload twice does not duplicate either built-in catalog', () => {
      const store = useWorkspaceStore()
      store.loadFromData(clone(v1WorkspaceFull))
      store.loadFromData(clone(v1WorkspaceFull))

      expect(store.workspace.catalogs.map((c) => c.id)).toEqual(['catalog-standard', 'catalog-interview'])
    })

    it('adds the interview catalog to a v2 workspace (that already has the standard catalog), idempotently', () => {
      const v2Payload = {
        version: 2,
        workspace: {
          id: 'ws1',
          projects: [],
          questionnaires: [],
          catalogs: [
            {
              id: 'catalog-standard',
              name: 'Standard Catalog',
              version: 1,
              schemaVersion: 1,
              categories: [{ id: 'meta', title: 'Metadata', isMetadata: true }]
            }
          ]
        }
      }

      const store = useWorkspaceStore()
      store.loadFromData(clone(v2Payload))
      expect(store.workspace.catalogs.map((c) => c.id)).toEqual(['catalog-standard', 'catalog-interview'])

      // Re-loading the same v2 payload must not add a second copy.
      store.loadFromData(clone(v2Payload))
      expect(store.workspace.catalogs.filter((c) => c.id === 'catalog-interview')).toHaveLength(1)
    })

    it('does not re-add the interview catalog to a v3 workspace where the user deleted it', () => {
      const v3PayloadWithoutInterview = {
        version: 3,
        workspace: {
          id: 'ws1',
          projects: [],
          questionnaires: [],
          catalogs: [
            {
              id: 'catalog-standard',
              name: 'Standard Catalog',
              version: 1,
              schemaVersion: 1,
              categories: [{ id: 'meta', title: 'Metadata', isMetadata: true }]
            }
          ]
        }
      }

      const store = useWorkspaceStore()
      store.loadFromData(clone(v3PayloadWithoutInterview))

      // Already v3 → no migration runs → a deliberate deletion sticks.
      expect(store.workspace.catalogs.map((c) => c.id)).toEqual(['catalog-standard'])
    })

    it('the oldest categories-only format also ends up with both built-in catalogs after migration', () => {
      const store = useWorkspaceStore()
      const ok = store.loadFromData(clone(v1CategoriesOnly))
      expect(ok).toBe(true)
      expect(store.workspace.catalogs.map((c) => c.id)).toEqual(['catalog-standard', 'catalog-interview'])
    })

    it('round-trips through persist() (now writing v3) and a fresh store reload without losing either catalog', async () => {
      const store = useWorkspaceStore()
      store.loadFromData(clone(v1WorkspaceFull))
      await store.persist()

      const persistedRaw = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(persistedRaw.version).toBe(3)
      // Records which app release wrote this file (see buildSnapshot in src/stores/persistence.js).
      expect(persistedRaw.appVersion).toBe(pkg.version)

      setActivePinia(createPinia())
      const restored = useWorkspaceStore()
      await restored.initFromStorage()

      expect(restored.workspace.catalogs.map((c) => c.id)).toEqual(['catalog-standard', 'catalog-interview'])
      expect(restored.workspace.projects.find((p) => p.id === 'project-p1').defaultCatalogId).toBe('catalog-standard')
    })

    it('a file written before appVersion tracking existed (no appVersion field) still loads fine', () => {
      // v1WorkspaceFull predates this field entirely — confirms its absence
      // is tolerated, not treated as corrupt/unsupported data.
      expect(v1WorkspaceFull.appVersion).toBeUndefined()
      const store = useWorkspaceStore()
      const ok = store.loadFromData(clone(v1WorkspaceFull))
      expect(ok).toBe(true)
    })
  })

  describe('built-in catalog refresh (pristine copies track the shipped seed)', () => {
    it('refreshes a pristine but stale built-in catalog to the current shipped content on load', () => {
      const store = useWorkspaceStore()
      store.loadFromData(v3PayloadWithStaleInterviewCatalog())

      const stored = store.workspace.catalogs.find((c) => c.id === 'catalog-interview')
      const seed = buildInterviewCatalog()
      // The two-category stale copy is replaced by the full current seed.
      expect(stored.categories.map((c) => c.id)).toEqual(seed.categories.map((c) => c.id))
      expect(stored.categories.length).toBeGreaterThan(2)
    })

    it('does NOT refresh a built-in catalog the user edited (version bumped past the baseline)', () => {
      const store = useWorkspaceStore()
      store.loadFromData(v3PayloadWithStaleInterviewCatalog({ version: 2 }))

      const stored = store.workspace.catalogs.find((c) => c.id === 'catalog-interview')
      // Edited → left exactly as stored (its own two categories), never clobbered.
      expect(stored.categories.map((c) => c.id)).toEqual(['context', 'domain'])
    })

    it('does NOT refresh a built-in catalog the user renamed in the library', () => {
      const store = useWorkspaceStore()
      store.loadFromData(v3PayloadWithStaleInterviewCatalog({ name: 'My Interview Guide' }))

      const stored = store.workspace.catalogs.find((c) => c.id === 'catalog-interview')
      expect(stored.name).toBe('My Interview Guide')
      expect(stored.categories.map((c) => c.id)).toEqual(['context', 'domain'])
    })

    it('leaves an already-current pristine built-in catalog untouched (no needless rewrite)', () => {
      const store = useWorkspaceStore()
      const current = buildInterviewCatalog()
      store.loadFromData({
        version: 3,
        workspace: { id: 'ws1', projects: [], questionnaires: [], catalogs: [current] }
      })

      const stored = store.workspace.catalogs.find((c) => c.id === 'catalog-interview')
      expect(stored.categories.length).toBe(current.categories.length)
    })
  })

  describe('B1 fix — unreadable/unrecognized workspace data is preserved, not silently discarded', () => {
    it('web: a payload with an unrecognized version sets workspaceLoadError instead of seeding', async () => {
      const payloadWithNewerVersion = { ...clone(v1WorkspaceFull), version: 999 }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadWithNewerVersion))

      const store = useWorkspaceStore()
      await store.initFromStorage()

      expect(store.workspaceLoadError).toEqual(expect.objectContaining({ reason: 'unsupported-version' }))
      // The in-memory workspace stays at its untouched initial state — no seed,
      // no partial data — until the user explicitly opts in to start fresh.
      expect(store.workspace.projects).toHaveLength(0)
      expect(store.workspace.questionnaires).toHaveLength(0)

      // The original payload on disk is untouched.
      const stillOnDisk = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stillOnDisk.workspace.projects[0].id).toBe('project-p1')
    })

    it('web: corrupt JSON sets workspaceLoadError instead of seeding', async () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json')

      const store = useWorkspaceStore()
      await store.initFromStorage()

      expect(store.workspaceLoadError).toEqual(expect.objectContaining({ reason: 'unreadable' }))
      expect(store.workspace.projects).toHaveLength(0)
      expect(store.workspace.questionnaires).toHaveLength(0)
      expect(localStorage.getItem(STORAGE_KEY)).toBe('{not valid json')
    })

    it('persist() is a no-op while workspaceLoadError is set, so autosave cannot overwrite the unreadable data', async () => {
      const payloadWithNewerVersion = { ...clone(v1WorkspaceFull), version: 999 }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadWithNewerVersion))

      const store = useWorkspaceStore()
      await store.initFromStorage()
      expect(store.workspaceLoadError).toBeTruthy()

      await store.persist()

      const stillOnDisk = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(stillOnDisk.workspace.projects[0].id).toBe('project-p1')
    })

    it('resolveWorkspaceLoadErrorWithFreshWorkspace() lets the user explicitly start over', async () => {
      const payloadWithNewerVersion = { ...clone(v1WorkspaceFull), version: 999 }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadWithNewerVersion))

      const store = useWorkspaceStore()
      await store.initFromStorage()
      expect(store.workspaceLoadError).toBeTruthy()

      store.resolveWorkspaceLoadErrorWithFreshWorkspace()

      expect(store.workspaceLoadError).toBeNull()
      expect(store.workspace.questionnaires).toHaveLength(1)
      expect(store.workspace.projects).toHaveLength(0)
    })

    it('electron: a missing data file still seeds (genuinely empty workspace directory)', async () => {
      window.electronAPI = {
        getWorkspaceDir: async () => '/fake/workspace',
        readDataFile: async () => ({ success: false, notFound: true, error: 'Workspace data file not found' })
      }

      const store = useWorkspaceStore()
      await store.initFromStorage()

      expect(store.workspaceLoadError).toBeNull()
      expect(store.workspace.questionnaires).toHaveLength(1)
    })

    it('electron: a read error (file exists but unreadable) sets workspaceLoadError instead of seeding', async () => {
      window.electronAPI = {
        getWorkspaceDir: async () => '/fake/workspace',
        readDataFile: async () => ({ success: false, error: 'EACCES: permission denied' })
      }

      const store = useWorkspaceStore()
      await store.initFromStorage()

      expect(store.workspaceLoadError).toEqual(
        expect.objectContaining({ reason: 'unreadable', message: 'EACCES: permission denied' })
      )
      expect(store.workspace.questionnaires).toHaveLength(0)
    })

    it('electron: an unrecognized version sets workspaceLoadError instead of seeding', async () => {
      const payloadWithNewerVersion = { ...clone(v1WorkspaceFull), version: 999 }
      window.electronAPI = {
        getWorkspaceDir: async () => '/fake/workspace',
        readDataFile: async () => ({ success: true, data: payloadWithNewerVersion })
      }

      const store = useWorkspaceStore()
      await store.initFromStorage()

      expect(store.workspaceLoadError).toEqual(expect.objectContaining({ reason: 'unsupported-version' }))
      expect(store.workspace.projects).toHaveLength(0)
    })
  })
})

describe('v3 workspace with radar data loads byte-identically', () => {
  // A workspace already stored at the current STORAGE_VERSION, carrying curated
  // radar data and a workspace-owned catalog (so no built-in refresh applies).
  // No migration step targets v3, so the only thing the load path may do to this
  // file is *add* the three vocabulary/comparison fields — never change one that
  // is already there.
  const ADDED_ON_LOAD = ['vocabulary', 'comparisonOverrides', 'dismissedSuggestions']

  it('leaves every stored workspace field untouched', () => {
    const store = useWorkspaceStore()
    const ok = store.loadFromData(clone(v3WorkspaceRadar))

    expect(ok).toBe(true)
    const loaded = { ...store.workspace }
    ADDED_ON_LOAD.forEach((field) => delete loaded[field])
    expect(loaded).toEqual(v3WorkspaceRadar.workspace)
  })

  it('adds exactly the three vocabulary/comparison fields and nothing else', () => {
    const store = useWorkspaceStore()
    store.loadFromData(clone(v3WorkspaceRadar))

    const added = Object.keys(store.workspace).filter((key) => !(key in v3WorkspaceRadar.workspace))
    expect(added.sort()).toEqual([...ADDED_ON_LOAD].sort())
    expect(store.workspace.vocabulary).toEqual([])
    expect(store.workspace.comparisonOverrides).toEqual({})
    expect(store.workspace.dismissedSuggestions).toEqual([])
  })

  it('keeps the stored version at 3 when the workspace is written back', async () => {
    const store = useWorkspaceStore()
    store.loadFromData(clone(v3WorkspaceRadar))
    await store.persist()

    // The three fields are additive, so STORAGE_VERSION stays where it is —
    // bumping it would make older builds reject the file outright.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).version).toBe(3)
  })

  it('does not overwrite vocabulary data that is already stored', () => {
    const stored = clone(v3WorkspaceRadar)
    stored.workspace.vocabulary = [{ id: 'term-x', name: 'X', kind: 'tool', aliases: ['x'] }]
    stored.workspace.comparisonOverrides = { 'term-x': { decision: 'accepted' } }
    stored.workspace.dismissedSuggestions = [['a', 'b']]

    const store = useWorkspaceStore()
    store.loadFromData(stored)

    expect(store.workspace.vocabulary).toEqual([{ id: 'term-x', name: 'X', kind: 'tool', aliases: ['x'] }])
    expect(store.workspace.comparisonOverrides).toEqual({ 'term-x': { decision: 'accepted' } })
    expect(store.workspace.dismissedSuggestions).toEqual([['a', 'b']])
  })

  it('replaces a field of the wrong type rather than trusting it', () => {
    const stored = clone(v3WorkspaceRadar)
    stored.workspace.vocabulary = 'not an array'
    stored.workspace.comparisonOverrides = null
    stored.workspace.dismissedSuggestions = 7

    const store = useWorkspaceStore()
    store.loadFromData(stored)

    expect(store.workspace.vocabulary).toEqual([])
    expect(store.workspace.comparisonOverrides).toEqual({})
    expect(store.workspace.dismissedSuggestions).toEqual([])
  })

  it('restores the tab state from the stored payload', () => {
    const store = useWorkspaceStore()
    store.loadFromData(clone(v3WorkspaceRadar))

    expect(store.activeQuestionnaireId).toBe('questionnaire-alpha')
    expect(store.openQuestionnaireIds).toEqual(['questionnaire-alpha', 'questionnaire-beta'])
    expect(store.openProjectSummaryIds).toEqual(['project-alpha'])
  })

  it('adds no built-in catalog to a v3 workspace that owns its catalogs', () => {
    const store = useWorkspaceStore()
    store.loadFromData(clone(v3WorkspaceRadar))

    expect(store.workspace.catalogs.map((catalog) => catalog.id)).toEqual(['catalog-house'])
  })

  it('keeps radar entries with an empty status as stored — they are not filled in on load', () => {
    const store = useWorkspaceStore()
    store.loadFromData(clone(v3WorkspaceRadar))

    const alpha = store.workspace.projects.find((project) => project.id === 'project-alpha')
    expect(alpha.radar.find((blip) => blip.option === '.NET Core').status).toBe('')
    expect(alpha.radar.find((blip) => blip.option === 'Redis').status).toBe('')
  })
})
