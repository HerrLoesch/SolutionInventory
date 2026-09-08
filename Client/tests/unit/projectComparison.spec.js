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

// ── Vocabulary section (Todo 4.4) ────────────────────────────────────────────
describe('vocabulary section', () => {
  // Alpha and Beta write the same tool with different capitalization; Alpha adds
  // one the vocabulary has never seen, without an answerType.
  //
  // Note the spellings differ in *case*, not whitespace: both adapters trim the
  // raw name (as the radar always has), so a trailing-space variant like the
  // design's "Serilog " can never reach the comparison.
  function spellingWorkspace() {
    const workspace = smallWorkspace()
    workspace.projects[0].radar.push({ entryId: 'e3', option: 'serilog', status: 'Adopt' })
    workspace.projects[1].radar.push({ entryId: 'e3', option: 'Serilog', status: 'Adopt' })
    workspace.projects[0].radar.push({ entryId: 'e4', option: 'Wolverine', status: 'Adopt' })
    workspace.questionnaires[0].categories[0].entries.push(
      { id: 'e3', aspect: 'Logging', answers: [{ technology: 'serilog', status: 'Adopt', answerType: 'Tool' }] },
      { id: 'e4', aspect: 'Messaging', answers: [{ technology: 'Wolverine', status: 'Adopt', answerType: '' }] }
    )
    workspace.questionnaires[1].categories[0].entries.push({
      id: 'e3',
      aspect: 'Logging',
      answers: [{ technology: 'Serilog', status: 'Adopt', answerType: 'Tool' }]
    })
    return workspace
  }

  it('reports coverage per selected project', () => {
    const { wrapper } = mountComparison(spellingWorkspace())

    expect(wrapper.vm.coveragePerProject['p-alpha'].percent).toBe(0)
    expect(wrapper.vm.coveragePerProject['p-gamma']).toEqual({
      total: 0,
      resolved: 0,
      unresolved: 0,
      percent: 100
    })
  })

  it('lists the unresolved names regardless of the kind filter', () => {
    const { wrapper } = mountComparison(spellingWorkspace())
    const before = wrapper.vm.unresolved.map((group) => group.key).sort()

    wrapper.vm.visibleKinds = ['tool']
    // Wolverine has no kind at all — hiding "unassigned" must not hide the very
    // names that most need assigning.
    expect(wrapper.vm.unresolved.map((group) => group.key).sort()).toEqual(before)
    expect(before).toContain('wolverine')
  })

  it('assigns every spelling of a group to a term at once', () => {
    const { wrapper, store } = mountComparison(spellingWorkspace())
    // A term under a different name, so the group is still unresolved.
    const termId = store.createTerm('Structured Logging', 'tool')
    const group = wrapper.vm.unresolved.find((entry) => entry.key === 'serilog')

    expect(group.spellings.map((spelling) => spelling.rawName)).toEqual(['serilog', 'Serilog'])
    wrapper.vm.assignGroup(group, termId)

    expect(store.resolveTerm('serilog').id).toBe(termId)
    expect(store.resolveTerm('Serilog').id).toBe(termId)
    expect(wrapper.vm.unresolved.map((entry) => entry.key)).not.toContain('serilog')
  })

  it('creates a term from a group, with the remaining spellings as aliases', () => {
    const { wrapper, store } = mountComparison(spellingWorkspace())
    const group = wrapper.vm.unresolved.find((entry) => entry.key === 'vue')

    const termId = wrapper.vm.createTermFromGroup(group)
    expect(store.workspace.vocabulary.find((term) => term.id === termId)).toMatchObject({ name: 'Vue', kind: 'tool' })
  })

  it('keeps "create as its own term" disabled without a kind, until one is chosen', () => {
    const { wrapper, store } = mountComparison(spellingWorkspace())
    const group = wrapper.vm.unresolved.find((entry) => entry.key === 'wolverine')

    expect(wrapper.vm.canCreateTerm(group)).toBe(false)
    expect(wrapper.vm.createTermFromGroup(group)).toBe('')
    expect(store.workspace.vocabulary).toEqual([])

    wrapper.vm.pendingKinds[group.key] = 'tool'
    expect(wrapper.vm.canCreateTerm(group)).toBe(true)
    expect(wrapper.vm.createTermFromGroup(group)).toBeTruthy()
    expect(store.workspace.vocabulary[0].kind).toBe('tool')
  })

  it('resolves all exact matches without changing the comparison result', () => {
    const { wrapper } = mountComparison(spellingWorkspace())
    const rowsBefore = wrapper.vm.rows.length
    const comparedBefore = wrapper.vm.metrics.compared
    const coverageBefore = wrapper.vm.metrics.vocabulary.percent

    expect(wrapper.vm.exactMatches.map((group) => group.key)).toEqual(['serilog'])
    wrapper.vm.resolveAllExactMatches()

    // Same rows, same comparison — those spellings already met through the
    // normalized text fallback (DE-2). Only the coverage moves.
    expect(wrapper.vm.rows.length).toBe(rowsBefore)
    expect(wrapper.vm.metrics.compared).toBe(comparedBefore)
    expect(wrapper.vm.metrics.vocabulary.percent).toBeGreaterThan(coverageBefore)
    expect(wrapper.vm.rows.find((row) => row.name === 'serilog').resolved).toBe(true)
  })

  it('offers a similarity suggestion and forgets it once dismissed', () => {
    const { wrapper, store } = mountComparison(spellingWorkspace())
    store.createTerm('Serilogg', 'tool')
    const group = wrapper.vm.unresolved.find((entry) => entry.key === 'serilog')

    expect(wrapper.vm.suggestionsFor(group).map((s) => s.term.name)).toEqual(['Serilogg'])

    wrapper.vm.dismissSuggestion(group, { name: 'Serilogg' })
    expect(wrapper.vm.suggestionsFor(group)).toEqual([])
    // Persistent, not per session.
    expect(store.workspace.dismissedSuggestions).toHaveLength(1)
  })

  it('names the projects behind a spelling', () => {
    const { wrapper } = mountComparison(spellingWorkspace())

    expect(wrapper.vm.projectNamesOf(['p-alpha', 'p-beta'])).toBe('Alpha · Beta')
  })
})

// ── Summary card (Todo 4.5) ──────────────────────────────────────────────────
describe('summary card', () => {
  it('renders only what the engine computed — the same object, not a recomputation', () => {
    const { wrapper } = mountComparison(designExample)

    // Everything the card shows comes off this one object.
    expect(Object.keys(wrapper.vm.metrics)).toEqual(
      expect.arrayContaining([
        'total',
        'all',
        'partial',
        'unique',
        'allPercent',
        'compared',
        'excluded',
        'unset',
        'inconsistent',
        'accepted',
        'comparable',
        'matches',
        'minor',
        'significant',
        'critical',
        'agreementPercent',
        'agreementLevel',
        'vocabulary'
      ])
    )
  })

  it('labels coverage and Δ states with the design’s symbols', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.coverageLabel('all')).toBe('◉ all')
    expect(wrapper.vm.coverageLabel('partial')).toBe('◐ partial')
    expect(wrapper.vm.coverageLabel('unique')).toBe('◑ unique')
    expect(wrapper.vm.deltaLabel('critical')).toBe('▲▲▲ critical')
    expect(wrapper.vm.deltaLabel('inconsistent')).toBe('⚠ inconsistent')
    expect(wrapper.vm.deltaLabel('none')).toBe('—')
  })
})

// ── Comparison matrix (Todo 4.6) ─────────────────────────────────────────────
describe('comparison matrix', () => {
  it('decorates every row with coverage, Δ and the reasons behind it', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const vue = wrapper.vm.rows.find((row) => row.name === 'Vue')

    // Vue is in Alpha and Beta but not in Gamma, and all three are selected.
    expect(vue).toMatchObject({ coverage: 'partial', delta: 'critical', distance: 4, resolved: false })
  })

  it('sorts by term, by coverage and by divergence', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Scrum', 'Vue'])

    wrapper.vm.sortBy = 'delta'
    // The critical row comes before the uncompared one.
    expect(wrapper.vm.visibleRows[0].name).toBe('Vue')

    wrapper.vm.sortBy = 'coverage'
    // Widest coverage first: partial (Vue) before unique (Scrum).
    expect(wrapper.vm.visibleRows.map((row) => row.coverage)).toEqual(['partial', 'unique'])
  })

  it('filters by coverage', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.coverageFilter = 'unique'

    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Scrum'])
  })

  it('filters on the visible badge, not on an outranked condition', () => {
    const workspace = smallWorkspace()
    // Alpha rates Vue twice and differently: inconsistent outranks the distance.
    workspace.projects[0].radar.push({ entryId: 'e5', option: 'Vue', status: 'Trial' })
    workspace.questionnaires[0].categories[0].entries.push({
      id: 'e5',
      aspect: 'UI again',
      answers: [{ technology: 'Vue', status: 'Trial', answerType: 'Tool' }]
    })
    const { wrapper } = mountComparison(workspace)

    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').delta).toBe('inconsistent')

    wrapper.vm.deltaFilter = 'critical'
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual([])

    wrapper.vm.deltaFilter = 'inconsistent'
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Vue'])
  })

  it('filters down to deviations, and to unresolved rows', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    wrapper.vm.deltaFilter = 'deviating'
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Vue'])

    wrapper.vm.deltaFilter = ''
    wrapper.vm.unresolvedOnly = true
    expect(wrapper.vm.visibleRows.map((row) => row.name).sort()).toEqual(['Scrum', 'Vue'])
  })

  it('searches terms, aliases and entry provenance', () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    const termId = store.createTerm('Vue', 'tool')
    store.addAlias(termId, 'vuejs')

    wrapper.vm.search = 'vuejs'
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Vue'])

    wrapper.vm.search = 'Process'
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Scrum'])
  })

  it('marks an unresolved unique row and its resolved counterpart as a possible false difference', () => {
    const workspace = smallWorkspace()
    // Alpha calls it "PostgreSQL", Gamma "Postgre SQL"; only the first resolves.
    workspace.vocabulary = [{ id: 'term-pg', name: 'PostgreSQL', kind: 'tool', aliases: [] }]
    workspace.projects[0].radar.push({ entryId: 'e6', option: 'PostgreSQL', status: 'Adopt' })
    workspace.projects[2].radar.push({ entryId: 'e7', option: 'Postgre SQL', status: 'Adopt' })
    const { wrapper } = mountComparison(workspace)

    const unresolvedSide = wrapper.vm.rows.find((row) => row.name === 'Postgre SQL')
    const resolvedSide = wrapper.vm.rows.find((row) => row.name === 'PostgreSQL')

    expect(unresolvedSide.coverage).toBe('unique')
    expect(unresolvedSide.possibleFalseDifference).toBe(true)
    // Marking only the unresolved half would leave the other half looking clean.
    expect(resolvedSide.possibleFalseDifference).toBe(true)
  })

  it('does not mark a plain unique row that resolves cleanly', () => {
    const workspace = smallWorkspace()
    workspace.vocabulary = [{ id: 'term-scrum', name: 'Scrum', kind: 'practice', aliases: [] }]
    const { wrapper } = mountComparison(workspace)

    expect(wrapper.vm.rows.find((row) => row.name === 'Scrum').possibleFalseDifference).toBe(false)
  })

  it('returns the cell of a project, and null where it has none', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const scrum = wrapper.vm.rows.find((row) => row.name === 'Scrum')

    expect(wrapper.vm.cellFor(scrum, 'p-alpha').values[0].status).toBe('Adopt')
    expect(wrapper.vm.cellFor(scrum, 'p-beta')).toBeNull()
  })

  it('opens the project’s summary when a cell is clicked', () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    wrapper.vm.openProjectRadar('p-beta')

    expect(store.openProjectSummaryIds).toContain('p-beta')
  })
})

// ── Criticality override in the UI (Todo 4.7) ────────────────────────────────
describe('criticality override', () => {
  function resolvedWorkspace() {
    const workspace = smallWorkspace()
    workspace.vocabulary = [{ id: 'term-vue', name: 'Vue', kind: 'tool', aliases: [] }]
    return workspace
  }

  it('offers the action on a resolved, comparable row', () => {
    const { wrapper } = mountComparison(resolvedWorkspace())

    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').canOverride).toBe(true)
  })

  it('refuses it on an unresolved row — the assignment comes first', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const row = wrapper.vm.rows.find((entry) => entry.name === 'Vue')

    expect(row.canOverride).toBe(false)
    expect(wrapper.vm.openOverrideDialog(row)).toBe(false)
    expect(wrapper.vm.overrideDialog).toBe(false)
  })

  it('refuses it on unique, inconsistent and unset rows', () => {
    const workspace = resolvedWorkspace()
    workspace.projects[1].radar[0].status = ''
    workspace.questionnaires[1].categories[0].entries[0].answers[0].status = ''
    const { wrapper } = mountComparison(workspace)

    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').delta).toBe('unset')
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').canOverride).toBe(false)
    expect(wrapper.vm.rows.find((row) => row.name === 'Scrum').canOverride).toBe(false)
  })

  it('saves an accepted override with its comment and the current context', () => {
    const { wrapper, store } = mountComparison(resolvedWorkspace())
    const row = wrapper.vm.rows.find((entry) => entry.name === 'Vue')

    wrapper.vm.openOverrideDialog(row)
    wrapper.vm.overrideLevel = 'accepted'
    wrapper.vm.overrideComment = 'Legacy service'
    expect(wrapper.vm.saveOverride()).toBe(true)

    expect(store.getComparisonOverride('term-vue')).toMatchObject({
      level: 'accepted',
      comment: 'Legacy service',
      contextProjects: ['p-alpha', 'p-beta'],
      contextStatuses: { 'p-alpha': 'Adopt', 'p-beta': 'Retire' }
    })
    // The badge follows immediately.
    expect(wrapper.vm.rows.find((entry) => entry.name === 'Vue').delta).toBe('accepted')
  })

  it('an upgrade to critical keeps the row in Comparable', () => {
    const { wrapper } = mountComparison(resolvedWorkspace())
    wrapper.vm.openOverrideDialog(wrapper.vm.rows.find((entry) => entry.name === 'Vue'))
    wrapper.vm.overrideLevel = 'critical'
    wrapper.vm.saveOverride()

    expect(wrapper.vm.metrics.critical).toBe(1)
    expect(wrapper.vm.metrics.comparable).toBe(1)
    expect(wrapper.vm.metrics.excluded).toBe(0)
  })

  it('reports a changed context while keeping the override in force', () => {
    const { wrapper, store } = mountComparison(resolvedWorkspace())
    wrapper.vm.openOverrideDialog(wrapper.vm.rows.find((entry) => entry.name === 'Vue'))
    wrapper.vm.saveOverride()
    expect(wrapper.vm.rows.find((entry) => entry.name === 'Vue').overrideStale).toBe(false)

    store.workspace.projects[1].radar[0].status = 'Hold'
    const row = wrapper.vm.rows.find((entry) => entry.name === 'Vue')
    expect(row.delta).toBe('accepted')
    expect(row.overrideStale).toBe(true)
  })

  it('removes an override again', () => {
    const { wrapper, store } = mountComparison(resolvedWorkspace())
    wrapper.vm.openOverrideDialog(wrapper.vm.rows.find((entry) => entry.name === 'Vue'))
    wrapper.vm.saveOverride()

    expect(wrapper.vm.clearOverride(wrapper.vm.rows.find((entry) => entry.name === 'Vue'))).toBe(true)
    expect(store.getComparisonOverride('term-vue')).toBeNull()
    expect(wrapper.vm.rows.find((entry) => entry.name === 'Vue').delta).toBe('critical')
  })
})

// The similarity search only ever *suggests* (design §3.2). What it does not
// find still has to be assignable, or the only way out is a second term for the
// same thing — which is exactly what the vocabulary exists to prevent.
describe('assigning a name by hand', () => {
  // "Vue" against the term "Vue.js": too far apart for the heuristic, obviously
  // the same thing to a person.
  function vuejsWorkspace() {
    const workspace = smallWorkspace()
    workspace.vocabulary = [{ id: 'term-vuejs', name: 'Vue.js', kind: 'tool', aliases: [] }]
    return workspace
  }

  it('offers every term for a group the heuristic has no suggestion for', () => {
    const { wrapper } = mountComparison(vuejsWorkspace())
    const group = wrapper.vm.unresolved.find((entry) => entry.key === 'vue')

    expect(wrapper.vm.suggestionsFor(group)).toEqual([])
    expect(wrapper.vm.termItems).toEqual([{ id: 'term-vuejs', title: 'Vue.js — tool' }])
  })

  it('resolves the name onto the term that was picked', () => {
    const { wrapper, store } = mountComparison(vuejsWorkspace())
    const group = wrapper.vm.unresolved.find((entry) => entry.key === 'vue')

    expect(wrapper.vm.assignGroup(group, 'term-vuejs')).toBe(true)
    expect(store.resolveTerm('Vue').id).toBe('term-vuejs')
    expect(wrapper.vm.unresolved.some((entry) => entry.key === 'vue')).toBe(false)
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue.js').resolved).toBe(true)
  })

  it('names an alias collision instead of throwing it at the user', () => {
    const workspace = vuejsWorkspace()
    workspace.vocabulary.push({ id: 'term-react', name: 'React', kind: 'tool', aliases: [] })
    const { wrapper } = mountComparison(workspace)

    expect(wrapper.vm.assignGroup({ key: 'react', spellings: [{ rawName: 'React' }] }, 'term-vuejs')).toBe(false)
    expect(wrapper.vm.vocabularyError).toMatch(/collision/i)
  })
})

// design §5.1 — "aren't these two the same thing?" is one action, whichever side
// happens to be in the vocabulary already.
describe('merging two rows', () => {
  // Beta spells the same technology "Vue.js" where Alpha writes "Vue".
  function splitWorkspace(vocabulary = []) {
    const workspace = smallWorkspace()
    workspace.vocabulary = vocabulary
    workspace.projects[1].radar[0].option = 'Vue.js'
    workspace.questionnaires[1].categories[0].entries[0].answers[0].technology = 'Vue.js'
    return workspace
  }

  it('folds one term into the other and keeps the target’s identity', () => {
    const workspace = splitWorkspace([
      { id: 'term-vue', name: 'Vue', kind: 'tool', aliases: [] },
      { id: 'term-vuejs', name: 'Vue.js', kind: 'tool', aliases: [] }
    ])
    const { wrapper, store } = mountComparison(workspace)
    expect(wrapper.vm.rows.map((row) => row.name).sort()).toEqual(['Scrum', 'Vue', 'Vue.js'])

    expect(wrapper.vm.openMergeDialog(wrapper.vm.rows.find((row) => row.name === 'Vue.js'))).toBe(true)
    wrapper.vm.mergeTargetKey = 'term:term-vue'
    expect(wrapper.vm.mergeNeedsKind).toBe(false)
    expect(wrapper.vm.confirmMerge()).toBe(true)

    expect(store.workspace.vocabulary.map((term) => term.id)).toEqual(['term-vue'])
    expect(store.resolveTerm('Vue.js').id).toBe('term-vue')
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').cells.size).toBe(2)
    expect(wrapper.vm.mergeDialog).toBe(false)
  })

  it('hangs an unresolved spelling on the term it belongs to', () => {
    const workspace = splitWorkspace([{ id: 'term-vue', name: 'Vue', kind: 'tool', aliases: [] }])
    const { wrapper, store } = mountComparison(workspace)

    wrapper.vm.openMergeDialog(wrapper.vm.rows.find((row) => row.name === 'Vue.js'))
    wrapper.vm.mergeTargetKey = 'term:term-vue'
    expect(wrapper.vm.confirmMerge()).toBe(true)

    // No second term was created — the spelling became an alias of the first.
    expect(store.workspace.vocabulary).toHaveLength(1)
    expect(store.resolveTerm('Vue.js').id).toBe('term-vue')
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').cells.size).toBe(2)
  })

  it('creates the target term first when neither side is in the vocabulary', () => {
    const workspace = splitWorkspace()
    // Alpha's answer carries no kind, so the target row has none either.
    workspace.questionnaires[0].categories[0].entries[0].answers[0].answerType = ''
    const { wrapper, store } = mountComparison(workspace)

    wrapper.vm.openMergeDialog(wrapper.vm.rows.find((row) => row.name === 'Vue.js'))
    wrapper.vm.mergeTargetKey = 'raw:vue'
    // Kind is mandatory on a term and never guessed (§3.1).
    expect(wrapper.vm.mergeNeedsKind).toBe(true)
    expect(wrapper.vm.canMerge).toBe(false)
    expect(wrapper.vm.confirmMerge()).toBe(false)

    wrapper.vm.mergeKind = 'tool'
    expect(wrapper.vm.canMerge).toBe(true)
    expect(wrapper.vm.confirmMerge()).toBe(true)

    expect(store.workspace.vocabulary.map((term) => term.name)).toEqual(['Vue'])
    expect(store.resolveTerm('Vue.js').name).toBe('Vue')
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').cells.size).toBe(2)
  })

  it('offers the other rows and every term, never the row itself', () => {
    const workspace = splitWorkspace([{ id: 'term-redis', name: 'Redis', kind: 'tool', aliases: [] }])
    const { wrapper } = mountComparison(workspace)
    const source = wrapper.vm.rows.find((row) => row.name === 'Vue.js')
    wrapper.vm.openMergeDialog(source)

    const keys = wrapper.vm.mergeTargets.map((target) => target.key)
    expect(keys).toContain('raw:vue')
    expect(keys).toContain('term:term-redis')
    expect(keys).not.toContain(source.key)
    // Nothing is preselected — a merge is never one stray click away.
    expect(wrapper.vm.canMerge).toBe(false)
  })
})

// ── Radar overlay (Todo 5.3) ─────────────────────────────────────────────────
describe('radar overlay', () => {
  it('defaults its reference project to the first selected one', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.referenceProject.id).toBe('p-alpha')
  })

  it('follows an explicitly chosen reference project', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.referenceProjectId = 'p-beta'

    expect(wrapper.vm.referenceProject.id).toBe('p-beta')
  })

  it('places a point per project take, inside the chart', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const vuePoints = wrapper.vm.overlayPoints.filter((point) => point.name === 'Vue')

    expect(vuePoints.map((point) => point.projectId).sort()).toEqual(['p-alpha', 'p-beta'])
    vuePoints.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(wrapper.vm.OVERLAY_SIZE)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(wrapper.vm.OVERLAY_SIZE)
    })
  })

  it('draws a conflict line for the Adopt/Retire row once the term resolves', () => {
    const unresolved = mountComparison(smallWorkspace())
    // Unresolved names get no conflict line — the identity is unclear.
    expect(unresolved.wrapper.vm.overlayLines).toEqual([])

    const workspace = smallWorkspace()
    workspace.vocabulary = [{ id: 'term-vue', name: 'Vue', kind: 'tool', aliases: [] }]
    const { wrapper } = mountComparison(workspace)

    expect(wrapper.vm.overlayLines.filter((line) => line.kind === 'cross-project')).toHaveLength(1)
  })

  it('gives each selected project its own colour', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const colors = wrapper.vm.selectedProjectIds.map((id) => wrapper.vm.projectColor(id))

    expect(new Set(colors).size).toBe(colors.length)
  })

  it('lists blips without a status instead of plotting them', () => {
    const workspace = smallWorkspace()
    workspace.projects[0].radar.push({ entryId: 'e8', option: 'Kafka', status: '' })
    workspace.questionnaires[0].categories[0].entries.push({
      id: 'e8',
      aspect: 'Messaging',
      answers: [{ technology: 'Kafka', status: '', answerType: 'Tool' }]
    })
    const { wrapper } = mountComparison(workspace)

    expect(wrapper.vm.overlay.withoutStatus.map((entry) => entry.name)).toEqual(['Kafka'])
    expect(wrapper.vm.overlayPoints.some((point) => point.name === 'Kafka')).toBe(false)
  })

  it('gives each project a symbol as well as a colour', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const shapes = wrapper.vm.selectedProjectIds.map((id) => wrapper.vm.projectShape(id))

    expect(new Set(shapes).size).toBe(shapes.length)
    expect(wrapper.vm.symbolPathAt('p-alpha', 7, 7, 5)).toContain('7')
  })

  it('names the quadrants after the reference project', () => {
    const workspace = smallWorkspace()
    workspace.projects[0].radarCategoryQuadrants = { Stack: 0 }
    workspace.projects[1].radarCategoryQuadrants = { Stack: 1 }
    const { wrapper } = mountComparison(workspace)

    expect(wrapper.vm.quadrantLabels[0]).toBe('Stack')

    wrapper.vm.referenceProjectId = 'p-beta'
    expect(wrapper.vm.quadrantLabels[0]).toBe('')
    expect(wrapper.vm.quadrantLabels[1]).toBe('Stack')
  })

  it('hides a project from the chart without dropping it from the comparison', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    expect(wrapper.vm.overlayPoints.some((point) => point.projectId === 'p-beta')).toBe(true)

    wrapper.vm.toggleOverlayProject('p-beta')
    expect(wrapper.vm.overlayPoints.some((point) => point.projectId === 'p-beta')).toBe(false)
    expect(wrapper.vm.selectedProjectIds).toContain('p-beta')
    expect(wrapper.vm.metrics.compared).toBe(1)

    wrapper.vm.toggleOverlayProject('p-beta')
    expect(wrapper.vm.overlayPoints.some((point) => point.projectId === 'p-beta')).toBe(true)
  })

  it('opens the row behind a point and closes it again', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const point = wrapper.vm.overlayPoints.find((entry) => entry.name === 'Vue')

    wrapper.vm.selectOverlayPoint(point)
    expect(wrapper.vm.selectedOverlayRow.name).toBe('Vue')
    expect(wrapper.vm.selectedOverlayRow.cells.size).toBe(2)

    wrapper.vm.selectOverlayPoint(point)
    expect(wrapper.vm.selectedOverlayRow).toBeNull()
  })
})

// design §5 — four foldable sections, vocabulary first because it says whether
// the rest of the page can be trusted.
describe('sections', () => {
  // Every name resolved, so the vocabulary section has nothing to report.
  function tidyWorkspace() {
    const workspace = smallWorkspace()
    workspace.vocabulary = [
      { id: 'term-vue', name: 'Vue', kind: 'tool', aliases: [] },
      { id: 'term-scrum', name: 'Scrum', kind: 'practice', aliases: [] }
    ]
    return workspace
  }

  it('keeps the vocabulary folded while everything resolves', () => {
    const { wrapper } = mountComparison(tidyWorkspace())

    expect(wrapper.vm.openSections).toEqual({ vocabulary: false, summary: true, matrix: true, overlay: true })
  })

  it('opens the vocabulary by itself as soon as a name does not resolve', async () => {
    const { wrapper, store } = mountComparison(tidyWorkspace())
    expect(wrapper.vm.openSections.vocabulary).toBe(false)

    store.workspace.projects[0].radar.push({ entryId: 'e-new', option: 'Kafka', status: 'Adopt' })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.unresolved.map((group) => group.key)).toEqual(['kafka'])
    expect(wrapper.vm.openSections.vocabulary).toBe(true)
  })

  it('starts the vocabulary open when there is something open from the start', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.openSections.vocabulary).toBe(true)
  })

  it('folds and unfolds a section on demand', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.toggleSection('matrix')).toBe(false)
    expect(wrapper.vm.openSections.matrix).toBe(false)
    expect(wrapper.vm.toggleSection('matrix')).toBe(true)
  })

  it('names the active kind selection in the summary header', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    expect(wrapper.vm.kindLabel).toBe('all kinds')

    wrapper.vm.visibleKinds = ['tool']
    expect(wrapper.vm.kindLabel).toBe('📐 Tools')

    wrapper.vm.visibleKinds = []
    expect(wrapper.vm.kindLabel).toBe('no kinds')
  })
})

describe('what the numbers say', () => {
  it('breaks the unique terms down per project (design §5.2)', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    // Scrum is Alpha's alone; Vue is in both, Gamma has no radar at all.
    expect(wrapper.vm.metrics.uniqueByProject).toMatchObject({ 'p-alpha': 1 })
    expect(wrapper.vm.uniqueBreakdown).toBe('Alpha 1')
  })

  it('reports a coverage per project, and zeroes for one that has none', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.coverageOf('p-alpha')).toMatchObject({ percent: 0, unresolved: 2 })
    expect(wrapper.vm.coverageOf('nope')).toEqual({ percent: 0, unresolved: 0, resolved: 0, total: 0 })
  })

  it('puts the origin of a single value in the cell tooltip (design §5.3)', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const row = wrapper.vm.rows.find((entry) => entry.name === 'Vue')

    expect(wrapper.vm.cellTitle(row, 'p-alpha')).toContain('("Vue")')
    expect(wrapper.vm.cellTitle(row, 'p-alpha')).toContain('Adopt')
    expect(wrapper.vm.cellTitle(row, 'p-gamma')).toBe('Not used in this project')
  })

  it('names the Δ reasons the visible badge outranked', () => {
    const workspace = smallWorkspace()
    // Alpha rates Vue twice and differently (⚠) while Beta leaves it unset (⊘).
    workspace.projects[0].radar.push({ entryId: 'e2', option: 'Vue', status: 'Hold' })
    workspace.projects[1].radar[0].status = ''
    workspace.questionnaires[1].categories[0].entries[0].answers[0].status = ''
    const { wrapper } = mountComparison(workspace)
    const row = wrapper.vm.rows.find((entry) => entry.name === 'Vue')

    expect(row.delta).toBe('inconsistent')
    expect(wrapper.vm.cellTitle(row, 'p-beta')).toContain('also applies')
    expect(wrapper.vm.cellTitle(row, 'p-beta')).toContain('⊘ unset')
  })
})

// A few hundred blips per project is the size this has to survive: the work
// list and the matrix are paged so a redraw never lays all of it into the DOM.
describe('at a few hundred terms', () => {
  function bigWorkspace(count = 150) {
    const entries = []
    for (let i = 0; i < count; i++) {
      entries.push({
        id: `e${i}`,
        aspect: `Aspect ${i}`,
        answers: [{ technology: `Technology ${i}`, status: 'Adopt', answerType: 'Tool' }]
      })
    }
    return {
      id: 'ws',
      vocabulary: [],
      comparisonOverrides: {},
      dismissedSuggestions: [],
      catalogs: [],
      projects: [
        {
          id: 'p-alpha',
          name: 'Alpha',
          questionnaireIds: ['q'],
          radar: entries.map((entry, i) => ({ entryId: entry.id, option: `Technology ${i}`, status: 'Adopt' }))
        },
        {
          id: 'p-beta',
          name: 'Beta',
          questionnaireIds: ['q'],
          radar: entries.map((entry, i) => ({ entryId: entry.id, option: `Technology ${i}`, status: 'Hold' }))
        }
      ],
      questionnaires: [{ id: 'q', name: 'Q', categories: [{ id: 'c', title: 'Stack', entries }] }]
    }
  }

  it('pages the matrix and can be asked for the rest', () => {
    const { wrapper } = mountComparison(bigWorkspace())

    expect(wrapper.vm.visibleRows).toHaveLength(150)
    expect(wrapper.vm.pagedRows).toHaveLength(100)

    wrapper.vm.showMoreRows()
    expect(wrapper.vm.pagedRows).toHaveLength(150)

    wrapper.vm.showAllRows()
    expect(wrapper.vm.pagedRows).toHaveLength(150)
  })

  it('starts the paging over when the filters change', async () => {
    const { wrapper } = mountComparison(bigWorkspace())
    wrapper.vm.showAllRows()
    expect(wrapper.vm.pagedRows).toHaveLength(150)

    // Still 150 hits, but the page starts from the top again.
    wrapper.vm.search = 'Technology'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.visibleRows).toHaveLength(150)
    expect(wrapper.vm.pagedRows).toHaveLength(100)
  })

  it('pages the vocabulary work list and only prices the visible part', () => {
    const { wrapper } = mountComparison(bigWorkspace())

    expect(wrapper.vm.unresolved).toHaveLength(150)
    expect(wrapper.vm.visibleUnresolved).toHaveLength(25)
    expect(wrapper.vm.suggestionsFor(wrapper.vm.visibleUnresolved[0])).toEqual([])

    wrapper.vm.showMoreUnresolved()
    expect(wrapper.vm.visibleUnresolved).toHaveLength(50)
  })

  it('keeps the user where they were when the comparison rebuilds', async () => {
    const { wrapper } = mountComparison(bigWorkspace())
    wrapper.vm.showMoreUnresolved()
    wrapper.vm.showAllRows()

    // An assignment rebuilds everything — and must not send the list back to
    // the top while someone is working through it.
    const group = wrapper.vm.visibleUnresolved[0]
    wrapper.vm.createTermFromGroup({ ...group, kind: 'tool' })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.visibleUnresolved).toHaveLength(50)
    expect(wrapper.vm.pagedRows).toHaveLength(wrapper.vm.visibleRows.length)
  })
})

describe('the overlay as export data', () => {
  it('hands over coordinates, colours and symbols as drawn', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const exported = wrapper.vm.overlayExport()

    expect(exported.rings.map((ring) => ring.label)).toEqual(['Adopt', 'Trial', 'Assess', 'Hold', 'Retire'])
    expect(exported.rings[0].color).toBe('#4caf50')
    expect(exported.referenceProject).toBe('Alpha')
    expect(exported.points).toHaveLength(wrapper.vm.overlayPoints.length)
    expect(exported.points[0].path).toMatch(/^M /)
    expect(exported.projects.map((project) => project.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('marks a project hidden from the chart instead of dropping it silently', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.toggleOverlayProject('p-beta')

    const exported = wrapper.vm.overlayExport()
    expect(exported.projects.find((project) => project.name === 'Beta').hidden).toBe(true)
    expect(exported.points.every((point) => point.project !== 'Beta')).toBe(true)
  })

  it('lists the blips it could not plot, each with a way back', () => {
    const workspace = smallWorkspace()
    workspace.projects[0].radar.push({ entryId: 'e8', option: 'Kafka', status: '' })
    workspace.questionnaires[0].categories[0].entries.push({
      id: 'e8',
      aspect: 'Messaging',
      answers: [{ technology: 'Kafka', status: '', answerType: 'Tool' }]
    })
    const { wrapper } = mountComparison(workspace)

    expect(wrapper.vm.withoutStatusChips.map((entry) => entry.name)).toEqual(['Kafka'])
    expect(wrapper.vm.withoutStatusChips[0].projectName).toBe('Alpha')
    expect(wrapper.vm.withoutStatusChips[0].projectId).toBe('p-alpha')
  })
})
