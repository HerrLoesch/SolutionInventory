// Golden-Master compatibility tests, see docs/spec-fragenkataloge.md §6.2.
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
import v1WorkspaceFull from '../data/storage/v1-workspace-full.json'
import v1WorkspaceLegacyRadar from '../data/storage/v1-workspace-legacy-radar.json'
import v1CategoriesOnly from '../data/storage/v1-categories-only.json'

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
      expect(project.radarQuadrantLabels).toEqual({ '0': 'Techniques', '1': 'Tools' })
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

  describe('B1 fix — unreadable/unrecognized workspace data is preserved, not silently discarded (docs/refactoring.md §2.0)', () => {
    it('web: a payload with an unrecognized version sets workspaceLoadError instead of seeding', async () => {
      const payloadWithNewerVersion = { ...clone(v1WorkspaceFull), version: 999 }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadWithNewerVersion))

      const store = useWorkspaceStore()
      await store.initFromStorage()

      expect(store.workspaceLoadError).toEqual(
        expect.objectContaining({ reason: 'unsupported-version' })
      )
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

      expect(store.workspaceLoadError).toEqual(
        expect.objectContaining({ reason: 'unsupported-version' })
      )
      expect(store.workspace.projects).toHaveLength(0)
    })
  })
})
