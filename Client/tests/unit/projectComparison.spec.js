import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import ProjectComparison from '../../src/components/workspace/ProjectComparison.vue'
import { createActivePinia, mountWithStore } from './helpers/mountWithStore'
import designExample from '../data/comparison/design-example-workspace.json'

// Vuetify isn't installed in these tests, so only the logic exposed on
// `wrapper.vm` is asserted — never rendered markup.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

// Mounts the tab on a workspace seeded before the component exists, so its
// initial selection sees the real projects.
function mountComparison(workspace) {
  const pinia = createActivePinia()
  const store = useWorkspaceStore()
  store.loadFromData({ version: 3, workspace: JSON.parse(JSON.stringify(workspace)) })
  const { wrapper } = mountWithStore(ProjectComparison, { pinia })
  return { wrapper, store }
}

// A small workspace whose two projects differ on one term and where Gamma has
// answers but no radar — the DE-4 situation.
function smallWorkspace() {
  return {
    id: 'ws',
    vocabulary: [],
    comparisonOverrides: {},
    dismissedSuggestions: [],
    projects: [
      {
        id: 'p-alpha',
        name: 'Alpha',
        questionnaireIds: ['q-alpha'],
        radar: [
          { entryId: 'e1', option: 'Vue', status: 'Adopt' },
          { entryId: 'e2', option: 'Scrum', status: 'Adopt' }
        ]
      },
      {
        id: 'p-beta',
        name: 'Beta',
        questionnaireIds: ['q-beta'],
        radar: [{ entryId: 'e1', option: 'Vue', status: 'Retire' }]
      },
      { id: 'p-gamma', name: 'Gamma', questionnaireIds: ['q-gamma'], radar: [] }
    ],
    questionnaires: [
      {
        id: 'q-alpha',
        name: 'Alpha Q',
        categories: [
          {
            id: 'c',
            title: 'Stack',
            entries: [
              { id: 'e1', aspect: 'UI', answers: [{ technology: 'Vue', status: 'Adopt', answerType: 'Tool' }] },
              {
                id: 'e2',
                aspect: 'Process',
                answers: [{ technology: 'Scrum', status: 'Adopt', answerType: 'Practice' }]
              }
            ]
          }
        ]
      },
      {
        id: 'q-beta',
        name: 'Beta Q',
        categories: [
          {
            id: 'c',
            title: 'Stack',
            entries: [
              { id: 'e1', aspect: 'UI', answers: [{ technology: 'Vue', status: 'Retire', answerType: 'Tool' }] }
            ]
          }
        ]
      },
      {
        id: 'q-gamma',
        name: 'Gamma Q',
        categories: [
          {
            id: 'c',
            title: 'Stack',
            entries: [
              { id: 'e9', aspect: 'UI', answers: [{ technology: 'React', status: 'Trial', answerType: 'Tool' }] }
            ]
          }
        ]
      }
    ],
    catalogs: []
  }
}

describe('project selection', () => {
  it('preselects every project and every kind', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.selectedProjectIds).toEqual(['p-alpha', 'p-beta', 'p-gamma'])
    expect(wrapper.vm.visibleKinds).toEqual(['tool', 'practice', 'unassigned'])
    expect(wrapper.vm.dataSource).toBe('radar')
  })

  it('recomputes when a project is deselected', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    expect(wrapper.vm.metrics.compared).toBe(1)

    wrapper.vm.deselectProject('p-beta')
    // Vue alone is left in Alpha — nothing to compare it against.
    expect(wrapper.vm.selectedProjectIds).toEqual(['p-alpha', 'p-gamma'])
    expect(wrapper.vm.metrics.compared).toBe(0)
  })

  it('drops a deleted project from the selection and picks up a new one', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    store.workspace.projects = store.workspace.projects.filter((project) => project.id !== 'p-gamma')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.selectedProjectIds).toEqual(['p-alpha', 'p-beta'])

    store.workspace.projects.push({ id: 'p-delta', name: 'Delta', questionnaireIds: [], radar: [] })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.selectedProjectIds).toEqual(['p-alpha', 'p-beta', 'p-delta'])
  })
})

describe('kind filter', () => {
  it('narrows the rows to the active kinds', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    expect(wrapper.vm.rows.map((row) => row.name).sort()).toEqual(['Scrum', 'Vue'])

    wrapper.vm.visibleKinds = ['tool']
    expect(wrapper.vm.rows.map((row) => row.name)).toEqual(['Vue'])
  })

  it('leaves the vocabulary coverage alone — the one metric that ignores the filter', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const before = wrapper.vm.metrics.vocabulary

    wrapper.vm.visibleKinds = ['tool']
    expect(wrapper.vm.metrics.vocabulary).toEqual(before)
  })
})

describe('data source', () => {
  it('switching to answers changes the metrics *and* the vocabulary coverage', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const radarRows = wrapper.vm.rows.length
    const radarCoverage = wrapper.vm.metrics.vocabulary

    wrapper.vm.dataSource = 'answers'
    // React only exists as an answer, so both the rows and the set of names the
    // coverage is measured over grow.
    expect(wrapper.vm.rows.length).toBeGreaterThan(radarRows)
    expect(wrapper.vm.metrics.vocabulary.total).toBeGreaterThan(radarCoverage.total)
  })

  it('names both adapters in the dropdown, defaulting to Radar', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.dataSourceItems.map((item) => item.value)).toEqual(wrapper.vm.dataSources)
    expect(wrapper.vm.dataSource).toBe('radar')
  })
})

// DE-4: warn, do not switch the comparison over on its own.
describe('projects without entries', () => {
  it('reports a selected project that contributes nothing in this source', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.projectsWithoutEntries.map((project) => project.name)).toEqual(['Gamma'])
    // The comparison stays in radar mode by itself.
    expect(wrapper.vm.dataSource).toBe('radar')
  })

  it('clears the warning once the answers source is chosen', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.dataSource = 'answers'

    expect(wrapper.vm.projectsWithoutEntries).toEqual([])
  })

  it('clears the warning when the project is deselected instead', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.deselectProject('p-gamma')

    expect(wrapper.vm.projectsWithoutEntries).toEqual([])
  })

  it('can be caused by the kind filter alone', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.deselectProject('p-gamma')
    wrapper.vm.visibleKinds = ['practice']

    // Only Alpha has a practice.
    expect(wrapper.vm.projectsWithoutEntries.map((project) => project.name)).toEqual(['Beta'])
  })
})

describe('on the design’s example workspace', () => {
  it('reproduces the figures from design §5.2 through the component', () => {
    const { wrapper } = mountComparison(designExample)

    expect(wrapper.vm.metrics).toMatchObject({
      total: 38,
      compared: 32,
      excluded: 5,
      comparable: 27,
      agreementPercent: 74,
      agreementLevel: 'moderate'
    })
    expect(wrapper.vm.metrics.vocabulary.percent).toBe(82)
  })
})
