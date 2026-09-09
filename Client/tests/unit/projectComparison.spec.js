import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import ProjectComparison from '../../src/components/workspace/ProjectComparison.vue'
import { createActivePinia, mountWithStore } from './helpers/mountWithStore'
import { COVERAGE, DELTA } from '../../src/services/comparison'
import { buildComparisonHtml } from '../../src/utils/comparisonExport'
import { TERM_KINDS } from '../../src/services/vocabulary'
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

  it('sorts by term, by coverage and by divergence from the column headers', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Scrum', 'Vue'])

    wrapper.vm.toggleSort('delta')
    // The critical row comes before the uncompared one.
    expect(wrapper.vm.visibleRows[0].name).toBe('Vue')

    wrapper.vm.toggleSort('coverage')
    // Widest coverage first: partial (Vue) before unique (Scrum).
    expect(wrapper.vm.visibleRows.map((row) => row.coverage)).toEqual(['partial', 'unique'])
  })

  it('offers one sortable header per rendered column', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.sortHeaders.map((header) => header.column)).toEqual([
      'term',
      'project:p-alpha',
      'project:p-beta',
      'project:p-gamma',
      'coverage',
      'delta'
    ])
    expect(wrapper.vm.sortHeaders.map((header) => header.label)).toEqual([
      'Term',
      'Alpha',
      'Beta',
      'Gamma',
      'Coverage',
      'Δ Status'
    ])
  })

  it('turns the active column around and starts a new column in its own order', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    expect(wrapper.vm.sort).toEqual({ column: 'term', direction: 'asc' })
    expect(wrapper.vm.ariaSortOf('term')).toBe('ascending')
    expect(wrapper.vm.ariaSortOf('coverage')).toBe('none')
    expect(wrapper.vm.sortMarkerOf('term')).toBe('▲')

    wrapper.vm.toggleSort('term')
    expect(wrapper.vm.sort).toEqual({ column: 'term', direction: 'desc' })
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Vue', 'Scrum'])
    expect(wrapper.vm.sortMarkerOf('term')).toBe('▼')

    // Switching columns must not inherit the previous direction.
    wrapper.vm.toggleSort('coverage')
    expect(wrapper.vm.sort).toEqual({ column: 'coverage', direction: 'asc' })
  })

  it('sorts a project column by that project’s status, empty cells last either way', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    wrapper.vm.toggleSort('project:p-alpha')
    // Alpha rates both; Adopt (Scrum and Vue) ties, so the name decides.
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Scrum', 'Vue'])

    wrapper.vm.toggleSort('project:p-beta')
    // Beta only knows Vue; the row it says nothing about goes last …
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Vue', 'Scrum'])
    wrapper.vm.toggleSort('project:p-beta')
    // … and stays last when the direction is turned around.
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Vue', 'Scrum'])
  })

  it('falls back to the term column when the sorted project leaves the selection', async () => {
    const { wrapper } = mountComparison(smallWorkspace())

    wrapper.vm.toggleSort('project:p-beta')
    wrapper.vm.deselectProject('p-beta')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.sort).toEqual({ column: 'term', direction: 'asc' })
  })

  it('filters by coverage', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.coverageFilter = 'unique'

    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Scrum'])
  })

  // The toolbar selects once took their items from array literals in the
  // template. A literal is a fresh array on every render, so VSelect re-keyed
  // its items under the open menu and the chosen filter never stuck — while
  // every test here still passed, because they set the state directly. This
  // pins the shape that fixed it: one stable array per list, exposed from
  // setup(). Vuetify is not installed in these tests, so the identity is what
  // can be asserted; the rendered menu cannot.
  it('offers the toolbar item lists as arrays that survive a re-render', async () => {
    const { wrapper } = mountComparison(smallWorkspace())

    const before = [wrapper.vm.coverageFilterItems, wrapper.vm.deltaFilterItems, wrapper.vm.termKindItems]
    before.forEach((items) => expect(Array.isArray(items)).toBe(true))

    wrapper.vm.search = 'vue'
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.coverageFilterItems).toBe(before[0])
    expect(wrapper.vm.deltaFilterItems).toBe(before[1])
    expect(wrapper.vm.termKindItems).toBe(before[2])
  })

  // Every value the Δ filter offers must be one the engine can actually
  // produce, and every coverage value likewise — a filter entry that matches
  // nothing by construction looks like a broken control.
  it('offers only filter values the engine can produce', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    const deltaValues = wrapper.vm.deltaFilterItems.map((item) => item.value).filter(Boolean)
    expect(deltaValues).toContain('deviating')
    deltaValues
      .filter((value) => value !== 'deviating')
      .forEach((value) => expect(Object.values(DELTA)).toContain(value))

    wrapper.vm.coverageFilterItems
      .map((item) => item.value)
      .filter(Boolean)
      .forEach((value) => expect(Object.values(COVERAGE)).toContain(value))

    expect(wrapper.vm.termKindItems).toEqual([...TERM_KINDS])
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

  // F8 — the summary says who is apart from whom, and every bar carries the
  // number of rows it rests on.
  it('offers one divergence bar per project pair, worst first', () => {
    const { wrapper } = mountComparison(smallWorkspace())

    const bars = wrapper.vm.divergenceBars
    // Only Alpha and Beta share a term; Gamma has no radar entries at all.
    expect(bars.map((bar) => bar.key)).toEqual(['p-alpha::p-beta'])
    expect(bars[0]).toMatchObject({ label: 'Alpha ↔ Beta', percent: 100, level: 'low', detail: 'over 1 term' })
    expect(bars[0].ariaLabel).toBe('Alpha ↔ Beta: 100 % apart over 1 term')
  })

  it('says so rather than drawing an empty chart when nothing can be measured', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.deselectProject('p-beta')

    expect(wrapper.vm.divergenceBars).toEqual([])
  })

  it('drops the divergence to zero once the pair has settled it', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.openAcceptDialog(
      wrapper.vm.rows.find((row) => row.name === 'Vue'),
      'p-beta'
    )
    wrapper.vm.acceptFrom = 'p-alpha'
    wrapper.vm.confirmAccept()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.divergenceBars[0]).toMatchObject({ percent: 0, level: 'high', detail: 'over 1 term' })
  })

  it('shows one bar per project against the reference, weakest first', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    expect(wrapper.vm.baselineBars.every((bar) => bar.percent === 0)).toBe(true)

    wrapper.vm.openBaselineDialog('')
    wrapper.vm.baselineName = 'Target'
    wrapper.vm.baselineSource = 'p-alpha'
    wrapper.vm.confirmBaseline()
    await wrapper.vm.$nextTick()

    const bars = wrapper.vm.baselineBars
    expect(bars.map((bar) => bar.label)).toEqual(['Beta', 'Gamma', 'Alpha'])
    expect(bars.find((bar) => bar.label === 'Alpha')).toMatchObject({ percent: 100, level: 'high' })
    expect(bars.find((bar) => bar.label === 'Beta')).toMatchObject({ percent: 0, level: 'low', detail: 'over 1 term' })
    // Gamma rates nothing the reference lists — 0 rows, not 0 % of something.
    expect(bars.find((bar) => bar.label === 'Gamma').detail).toBe('over 0 terms')
  })

  it('carries the pairwise figures into the export and draws them in the report', async () => {
    const { wrapper } = mountComparison(smallWorkspace())

    const data = wrapper.vm.exportData()
    // The export carries every pair, measured or not; the report draws only the
    // ones with rows behind them.
    expect(data.pairwiseDivergence).toHaveLength(3)
    expect(data.pairwiseDivergence).toContainEqual(
      expect.objectContaining({ a: 'p-alpha', b: 'p-beta', percent: 100, comparedRows: 1 })
    )
    const html = buildComparisonHtml(data)
    expect(html).toContain('How far apart the projects are')
    expect(html).toContain('Alpha ↔ Beta')
  })

  // F7 — the second question the matrix can answer: not "do the projects agree"
  // but "does each of them match the target".
  it('takes a reference from a project column and measures everyone against it', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())

    wrapper.vm.openBaselineDialog('')
    wrapper.vm.baselineName = 'Target'
    wrapper.vm.baselineSource = 'p-alpha'
    expect(wrapper.vm.confirmBaseline()).toBe(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.inBaselineMode).toBe(true)
    expect(wrapper.vm.comparisonMode).toBe('baseline')
    expect(store.workspace.comparisonBaselines[0].name).toBe('Target')

    // Alpha *is* the reference, so it follows it completely; Beta says Retire
    // where the target says Adopt.
    expect(wrapper.vm.agreementWith('p-alpha')).toMatchObject({ percent: 100 })
    expect(wrapper.vm.agreementWith('p-beta')).toMatchObject({ percent: 0, comparedRows: 1 })
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue')).toMatchObject({
      delta: 'critical',
      baselineStatus: 'Adopt'
    })
  })

  it('takes a reference from the consensus and reports what it had to leave out', async () => {
    const { wrapper } = mountComparison(smallWorkspace())

    wrapper.vm.openBaselineDialog('')
    wrapper.vm.baselineName = 'Consensus'
    wrapper.vm.baselineSource = 'consensus'
    wrapper.vm.confirmBaseline()
    await wrapper.vm.$nextTick()

    // Alpha says Adopt and Beta says Retire about Vue — a tie, so no target.
    expect(wrapper.vm.baselineSkipped.map((entry) => entry.name)).toEqual(['Vue'])
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').delta).toBe('unlisted')
    // Scrum only Alpha rates, so the consensus is Alpha's answer.
    expect(wrapper.vm.rows.find((row) => row.name === 'Scrum')).toMatchObject({
      delta: 'match',
      baselineStatus: 'Adopt'
    })
  })

  it('gives the matrix a reference column and a header to sort it by', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    expect(wrapper.vm.sortHeaders.map((header) => header.column)).not.toContain('baseline')

    wrapper.vm.openBaselineDialog('')
    wrapper.vm.baselineName = 'Target'
    wrapper.vm.baselineSource = 'p-alpha'
    wrapper.vm.confirmBaseline()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.sortHeaders.map((header) => header.column)).toEqual([
      'term',
      'baseline',
      'project:p-alpha',
      'project:p-beta',
      'project:p-gamma',
      'coverage',
      'delta'
    ])
    wrapper.vm.toggleSort('baseline')
    // Rows without a target sort last whichever way round it goes.
    expect(wrapper.vm.visibleRows[wrapper.vm.visibleRows.length - 1].baselineStatus).toBeTruthy()
  })

  it('switching back to peer mode changes the reading but no stored data', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    wrapper.vm.openBaselineDialog('')
    wrapper.vm.baselineName = 'Target'
    wrapper.vm.baselineSource = 'p-alpha'
    wrapper.vm.confirmBaseline()
    await wrapper.vm.$nextTick()
    const stored = JSON.parse(JSON.stringify(store.workspace.comparisonBaselines))

    wrapper.vm.comparisonMode = 'peer'
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.inBaselineMode).toBe(false)
    expect(wrapper.vm.metrics.unlisted).toBe(0)
    expect(wrapper.vm.baselineAgreement).toEqual({})
    expect(store.workspace.comparisonBaselines).toEqual(stored)
  })

  it('drops back to comparing the projects when the reference is deleted', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    wrapper.vm.openBaselineDialog('')
    wrapper.vm.baselineName = 'Target'
    wrapper.vm.baselineSource = 'p-alpha'
    wrapper.vm.confirmBaseline()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.deleteBaseline(store.workspace.comparisonBaselines[0].id)).toBe(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.comparisonMode).toBe('peer')
    expect(wrapper.vm.activeBaselineId).toBe('')
    expect(wrapper.vm.inBaselineMode).toBe(false)
  })

  it('re-takes an existing reference under the same id instead of adding a second', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    wrapper.vm.openBaselineDialog('')
    wrapper.vm.baselineName = 'Target'
    wrapper.vm.baselineSource = 'p-alpha'
    wrapper.vm.confirmBaseline()
    await wrapper.vm.$nextTick()
    const id = store.workspace.comparisonBaselines[0].id

    store.workspace.projects[0].radar[0].status = 'Trial'
    wrapper.vm.openBaselineDialog(id)
    expect(wrapper.vm.baselineName).toBe('Target')
    wrapper.vm.confirmBaseline()
    await wrapper.vm.$nextTick()

    expect(store.workspace.comparisonBaselines).toHaveLength(1)
    expect(store.workspace.comparisonBaselines[0].entries['raw:vue'].status).toBe('Trial')
  })

  it('carries the reference and each project’s agreement with it into the export', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.openBaselineDialog('')
    wrapper.vm.baselineName = 'Target'
    wrapper.vm.baselineSource = 'p-alpha'
    wrapper.vm.confirmBaseline()
    await wrapper.vm.$nextTick()

    const data = wrapper.vm.exportData()
    expect(data.baseline).toMatchObject({ name: 'Target', origin: { kind: 'project', projectId: 'p-alpha' } })
    expect(data.baseline.entries['raw:vue']).toMatchObject({ status: 'Adopt' })
    expect(data.baseline.agreement['p-beta']).toMatchObject({ percent: 0, comparedRows: 1 })
    expect(data.terms.find((term) => term.name === 'Vue').baselineStatus).toBe('Adopt')
  })

  // F5 — dragging one term onto another is the short way to say "these are the
  // same thing". It opens the merge dialog rather than merging: the merge
  // changes the vocabulary for every project, however it was started.
  it('opens the merge dialog prefilled when one term is dropped on another', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const scrum = wrapper.vm.rows.find((row) => row.name === 'Scrum')
    const vue = wrapper.vm.rows.find((row) => row.name === 'Vue')

    const event = { dataTransfer: { setData: () => {}, effectAllowed: '', dropEffect: '' } }
    wrapper.vm.startRowDrag(scrum, event)
    expect(wrapper.vm.dragSourceKey).toBe(scrum.key)

    expect(wrapper.vm.dropOnRow(vue)).toBe(true)
    expect(wrapper.vm.mergeDialog).toBe(true)
    expect(wrapper.vm.mergeRow.key).toBe(scrum.key)
    expect(wrapper.vm.mergeTargetKey).toBe(vue.key)
    // Nothing has been merged yet — the dialog still has to be confirmed.
    expect(wrapper.vm.rows).toHaveLength(2)
  })

  it('marks only a row that could actually take the drop', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const scrum = wrapper.vm.rows.find((row) => row.name === 'Scrum')
    const vue = wrapper.vm.rows.find((row) => row.name === 'Vue')
    const event = () => ({ preventDefault: () => {}, dataTransfer: { dropEffect: '' } })

    // Nothing is being dragged yet.
    expect(wrapper.vm.dragOverRow(vue, event())).toBe(false)

    wrapper.vm.startRowDrag(scrum, { dataTransfer: { setData: () => {} } })
    expect(wrapper.vm.dragOverRow(scrum, event())).toBe(false)
    expect(wrapper.vm.isDropTarget(scrum)).toBe(false)
    expect(wrapper.vm.dragOverRow(vue, event())).toBe(true)
    expect(wrapper.vm.isDropTarget(vue)).toBe(true)

    wrapper.vm.endRowDrag()
    expect(wrapper.vm.isDropTarget(vue)).toBe(false)
  })

  it('does nothing when a term is dropped on itself or nothing was dragged', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const vue = wrapper.vm.rows.find((row) => row.name === 'Vue')

    expect(wrapper.vm.dropOnRow(vue)).toBe(false)
    wrapper.vm.startRowDrag(vue, { dataTransfer: { setData: () => {} } })
    expect(wrapper.vm.dropOnRow(vue)).toBe(false)
    expect(wrapper.vm.mergeDialog).toBe(false)
  })

  it('carries a merged row’s decisions over to the row that survives', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    const scrum = wrapper.vm.rows.find((row) => row.name === 'Scrum')
    const vue = wrapper.vm.rows.find((row) => row.name === 'Vue')
    store.setComparisonIgnored(scrum.key, { reason: 'duplicate spelling' })
    store.setComparisonAcceptance(scrum.key, 'p-beta', { mode: 'absence' })
    await wrapper.vm.$nextTick()

    wrapper.vm.startRowDrag(wrapper.vm.ignoredRows[0], { dataTransfer: { setData: () => {} } })
    wrapper.vm.dropOnRow(vue)
    wrapper.vm.mergeKind = 'tool'
    expect(wrapper.vm.confirmMerge()).toBe(true)
    await wrapper.vm.$nextTick()

    // The decisions were about the thing the user just said these two are.
    expect(store.workspace.comparisonIgnored[scrum.key]).toBeUndefined()
    expect(store.workspace.comparisonIgnored[vue.key]).toMatchObject({ reason: 'duplicate spelling' })
    expect(store.workspace.comparisonAcceptances[scrum.key]).toBeUndefined()
    expect(store.workspace.comparisonAcceptances[vue.key]['p-beta']).toMatchObject({ mode: 'absence' })
  })

  // F3 — the two shapes of "we go along with that", offered on the cell the
  // decision is about and counted as agreement rather than as a waived finding.
  it('accepts an absence, so a term only one project rates counts as agreed', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    // Scrum is Alpha's alone; Beta and Gamma say nothing.
    const before = wrapper.vm.rows.find((row) => row.name === 'Scrum')
    expect(before.delta).toBe('none')
    expect(wrapper.vm.canOfferAcceptance(before, 'p-beta')).toBe(true)

    wrapper.vm.openAcceptDialog(before, 'p-beta')
    expect(wrapper.vm.acceptIsAbsence).toBe(true)
    expect(wrapper.vm.confirmAccept()).toBe(true)
    await wrapper.vm.$nextTick()

    const after = wrapper.vm.rows.find((row) => row.name === 'Scrum')
    expect(after.delta).toBe('silent')
    expect(wrapper.vm.isAcceptanceApplied(after, 'p-beta')).toBe(true)
    expect(wrapper.vm.acceptanceLabel(after, 'p-beta')).toContain('goes along')
    // Agreement reached counts as agreement, and says so separately.
    expect(wrapper.vm.metrics.silent).toBe(1)
    expect(wrapper.vm.metrics.matches).toBeGreaterThanOrEqual(1)
  })

  it('accepts another project’s status, so the difference stops counting as one', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const before = wrapper.vm.rows.find((row) => row.name === 'Vue')
    expect(before.delta).toBe('critical')

    wrapper.vm.openAcceptDialog(before, 'p-beta')
    expect(wrapper.vm.acceptIsAbsence).toBe(false)
    expect(wrapper.vm.acceptSources.map((source) => source.id)).toEqual(['p-alpha'])
    wrapper.vm.acceptFrom = 'p-alpha'
    wrapper.vm.acceptComment = 'Alpha owns the frontend'
    expect(wrapper.vm.confirmAccept()).toBe(true)
    await wrapper.vm.$nextTick()

    const after = wrapper.vm.rows.find((row) => row.name === 'Vue')
    expect(after.delta).toBe('silent')
    expect(wrapper.vm.acceptanceLabel(after, 'p-beta')).toContain('Alpha')
    expect(wrapper.vm.acceptanceTitle(after, 'p-beta')).toContain('Alpha owns the frontend')
    // The cell keeps its own value — the comparison just reads Alpha's.
    expect(after.cells.get('p-beta').values[0].status).toBe('Retire')
  })

  it('records the context, and flags the decision once the situation moves on', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    wrapper.vm.openAcceptDialog(
      wrapper.vm.rows.find((row) => row.name === 'Vue'),
      'p-beta'
    )
    wrapper.vm.acceptFrom = 'p-alpha'
    wrapper.vm.confirmAccept()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isAcceptanceStale(wrapper.vm.rows.find((row) => row.name === 'Vue'), 'p-beta')).toBe(false)

    store.workspace.projects[0].radar[0].status = 'Trial'
    await wrapper.vm.$nextTick()

    const row = wrapper.vm.rows.find((entry) => entry.name === 'Vue')
    // Still in force — Beta reads as Trial now — but worth a look.
    expect(row.delta).toBe('silent')
    expect(wrapper.vm.isAcceptanceStale(row, 'p-beta')).toBe(true)
    expect(wrapper.vm.acceptanceTitle(row, 'p-beta')).toContain('worth a look')
  })

  it('does not offer an acceptance where there is nothing to accept', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const vue = wrapper.vm.rows.find((row) => row.name === 'Vue')

    // Gamma has nothing and neither has anyone else on a Gamma-only term …
    const scrum = wrapper.vm.rows.find((row) => row.name === 'Scrum')
    expect(wrapper.vm.canOfferAcceptance(scrum, 'p-alpha')).toBe(false)

    // … and a project that already agrees has nothing to accept either.
    wrapper.vm.deselectProject('p-gamma')
    const agreeing = { ...vue, cells: new Map(vue.cells) }
    agreeing.cells.set('p-beta', { projectId: 'p-beta', values: [{ status: 'Adopt', origin: { rawName: 'Vue' } }] })
    expect(wrapper.vm.canOfferAcceptance(agreeing, 'p-beta')).toBe(false)
  })

  it('takes an acceptance back from the cell it was set on', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.openAcceptDialog(
      wrapper.vm.rows.find((row) => row.name === 'Vue'),
      'p-beta'
    )
    wrapper.vm.acceptFrom = 'p-alpha'
    wrapper.vm.confirmAccept()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.clearAcceptance(wrapper.vm.rows.find((row) => row.name === 'Vue'), 'p-beta')).toBe(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').delta).toBe('critical')
    expect(wrapper.vm.metrics.silent).toBe(0)
  })

  it('does not report a silent acceptance as a deviation', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.openAcceptDialog(
      wrapper.vm.rows.find((row) => row.name === 'Vue'),
      'p-beta'
    )
    wrapper.vm.acceptFrom = 'p-alpha'
    wrapper.vm.confirmAccept()
    await wrapper.vm.$nextTick()

    wrapper.vm.deltaFilter = 'deviating'
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual([])
    wrapper.vm.deltaFilter = 'silent'
    expect(wrapper.vm.visibleRows.map((row) => row.name)).toEqual(['Vue'])
  })

  it('carries the acceptance into the export, saying whether it still applies', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.openAcceptDialog(
      wrapper.vm.rows.find((row) => row.name === 'Vue'),
      'p-beta'
    )
    wrapper.vm.acceptFrom = 'p-alpha'
    wrapper.vm.acceptComment = 'Alpha owns the frontend'
    wrapper.vm.confirmAccept()
    await wrapper.vm.$nextTick()

    const term = wrapper.vm.exportData().terms.find((entry) => entry.name === 'Vue')
    const beta = term.projects.find((project) => project.projectId === 'p-beta')
    expect(term.delta).toBe('silent')
    expect(beta.acceptance).toMatchObject({
      mode: 'status',
      acceptedFrom: 'p-alpha',
      comment: 'Alpha owns the frontend',
      applies: true,
      needsReview: false
    })
  })

  // F2 — renaming keeps the term's identity, so nothing that points at it is
  // lost; a row the vocabulary does not resolve has no identity to keep and is
  // offered the one thing that helps: becoming a term.
  it('renames a term and keeps the old spelling resolving to it', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    const termId = store.createTerm('Vue', 'tool')
    store.setComparisonOverride(termId, { level: 'accepted' })
    await wrapper.vm.$nextTick()

    wrapper.vm.openRenameDialog(wrapper.vm.rows.find((row) => row.name === 'Vue'))
    wrapper.vm.renameName = 'Vue.js'
    expect(wrapper.vm.confirmRename()).toBe(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.renameDialog).toBe(false)
    // Same id, same row, same override — the blips say "Vue" and still land here.
    expect(store.workspace.vocabulary[0]).toMatchObject({ id: termId, name: 'Vue.js' })
    expect(store.getComparisonOverride(termId)).toBeTruthy()
    const row = wrapper.vm.rows.find((entry) => entry.key === `term:${termId}`)
    expect(row.name).toBe('Vue.js')
    expect(row.cells.get('p-alpha').values).toHaveLength(1)
  })

  it('refuses a rename onto a name another term already owns, and says so', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    store.createTerm('Vue', 'tool')
    store.createTerm('Scrum', 'practice')
    await wrapper.vm.$nextTick()

    wrapper.vm.openRenameDialog(wrapper.vm.rows.find((row) => row.name === 'Vue'))
    wrapper.vm.renameName = 'Scrum'

    expect(wrapper.vm.confirmRename()).toBe(false)
    expect(wrapper.vm.renameError).toContain('Merge')
    expect(wrapper.vm.renameDialog).toBe(true)
    expect(store.workspace.vocabulary.map((term) => term.name).sort()).toEqual(['Scrum', 'Vue'])
  })

  it('turns an unresolved row into a term instead of pretending to rename it', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    const row = wrapper.vm.rows.find((entry) => entry.name === 'Vue')
    expect(row.resolved).toBe(false)

    wrapper.vm.openRenameDialog(row)
    expect(wrapper.vm.renameCreatesTerm).toBe(true)
    // The row already knows it is a tool, so no kind has to be asked for.
    expect(wrapper.vm.renameNeedsKind).toBe(false)
    wrapper.vm.renameName = 'Vue.js'
    expect(wrapper.vm.confirmRename()).toBe(true)
    await wrapper.vm.$nextTick()

    const term = store.workspace.vocabulary[0]
    expect(term).toMatchObject({ name: 'Vue.js', kind: 'tool' })
    // The spelling the projects use has to become an alias, or the row splits.
    expect(term.aliases).toContain('vue')
    expect(wrapper.vm.rows.map((entry) => entry.name)).toContain('Vue.js')
  })

  it('asks for a kind before creating a term from a row that has none', async () => {
    const workspace = smallWorkspace()
    delete workspace.questionnaires[0].categories[0].entries[0].answers[0].answerType
    delete workspace.questionnaires[1].categories[0].entries[0].answers[0].answerType
    const { wrapper } = mountComparison(workspace)

    wrapper.vm.openRenameDialog(wrapper.vm.rows.find((row) => row.name === 'Vue'))
    wrapper.vm.renameName = 'Vue.js'

    expect(wrapper.vm.renameNeedsKind).toBe(true)
    expect(wrapper.vm.canRename).toBe(false)
    wrapper.vm.renameKind = 'tool'
    expect(wrapper.vm.canRename).toBe(true)
  })

  it('refuses an empty name in either mode', () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.openRenameDialog(wrapper.vm.rows[0])

    wrapper.vm.renameName = '   '
    expect(wrapper.vm.canRename).toBe(false)
    expect(wrapper.vm.confirmRename()).toBe(false)
  })

  it('carries the decisions along when naming a row turns it into a term', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    const row = wrapper.vm.rows.find((entry) => entry.name === 'Vue')
    store.setComparisonAcceptance(row.key, 'p-gamma', { mode: 'absence' })
    store.createComparisonBaseline({ name: 'Target', entries: { [row.key]: { name: 'Vue', status: 'Adopt' } } })
    await wrapper.vm.$nextTick()

    wrapper.vm.openRenameDialog(wrapper.vm.rows.find((entry) => entry.name === 'Vue'))
    wrapper.vm.renameName = 'Vue.js'
    wrapper.vm.confirmRename()
    await wrapper.vm.$nextTick()

    const termId = store.workspace.vocabulary[0].id
    // Same thing, new key — the reference must not keep a target under the old
    // one, or the row comes back as a phantom gap next to the renamed one.
    expect(store.workspace.comparisonBaselines[0].entries).toEqual({
      [`term:${termId}`]: { name: 'Vue', status: 'Adopt' }
    })
    expect(store.workspace.comparisonAcceptances[`term:${termId}`]['p-gamma']).toMatchObject({ mode: 'absence' })
    expect(store.workspace.comparisonAcceptances[row.key]).toBeUndefined()
  })

  it('lists, searches and corrects the vocabulary’s own terms', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    const vueId = store.createTerm('Veu', 'tool')
    store.addAlias(vueId, 'vue')
    store.createTerm('Scrum', 'practice')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.matchingTerms.map((term) => term.name)).toEqual(['Scrum', 'Veu'])
    wrapper.vm.termSearch = 'scr'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.matchingTerms.map((term) => term.name)).toEqual(['Scrum'])
    // The search reaches the aliases too, not only the canonical name.
    wrapper.vm.termSearch = 'vue'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.matchingTerms.map((term) => term.name)).toEqual(['Veu'])

    const term = wrapper.vm.matchingTerms[0]
    expect(wrapper.vm.renameVocabularyTerm(term, 'Vue')).toBe(true)
    expect(wrapper.vm.setVocabularyTermKind(store.workspace.vocabulary[0], 'practice')).toBe(true)
    expect(wrapper.vm.setVocabularyTermNote(store.workspace.vocabulary[0], 'the framework')).toBe(true)
    expect(store.workspace.vocabulary[0]).toMatchObject({ id: vueId, name: 'Vue', kind: 'practice', note: 'the framework' })
  })

  it('reports a rename in the term list that would collide, without changing anything', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    store.createTerm('Vue', 'tool')
    store.createTerm('Scrum', 'practice')
    await wrapper.vm.$nextTick()

    const scrum = wrapper.vm.matchingTerms.find((term) => term.name === 'Scrum')
    expect(wrapper.vm.renameVocabularyTerm(scrum, 'Vue')).toBe(false)
    expect(wrapper.vm.vocabularyError).toContain('Merge')
    expect(store.workspace.vocabulary.map((term) => term.name).sort()).toEqual(['Scrum', 'Vue'])
  })

  it('removes an alias and deletes a term, leaving the project data alone', async () => {
    const { wrapper, store } = mountComparison(smallWorkspace())
    const termId = store.createTerm('Vue', 'tool')
    store.addAlias(termId, 'vuejs')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.removeVocabularyAlias(store.workspace.vocabulary[0], 'vuejs')).toBe(true)
    expect(store.workspace.vocabulary[0].aliases).not.toContain('vuejs')

    expect(wrapper.vm.deleteVocabularyTerm(store.workspace.vocabulary[0])).toBe(true)
    expect(store.workspace.vocabulary).toEqual([])
    // The blip is untouched — it just stops resolving and shows as ◌ again.
    expect(store.workspace.projects[0].radar[0].option).toBe('Vue')
    expect(wrapper.vm.rows.find((row) => row.name === 'Vue').resolved).toBe(false)
  })

  // F1 — the mark takes the row out of the comparison; the table can still be
  // asked to show it so the decision can be reversed where it was taken.
  it('marks a term as not important and takes it out of the table and the figures', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    const total = wrapper.vm.metrics.total

    wrapper.vm.openIgnoreDialog(wrapper.vm.rows.find((row) => row.name === 'Scrum'))
    wrapper.vm.ignoreReason = 'not our decision'
    expect(wrapper.vm.confirmIgnore()).toBe(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.ignoreDialog).toBe(false)
    expect(wrapper.vm.rows.map((row) => row.name)).not.toContain('Scrum')
    expect(wrapper.vm.visibleRows.map((row) => row.name)).not.toContain('Scrum')
    expect(wrapper.vm.metrics.total).toBe(total - 1)
    expect(wrapper.vm.metrics.ignored).toBe(1)
    expect(wrapper.vm.ignoredRows[0].ignored.reason).toBe('not our decision')
  })

  it('shows marked terms again on request, still marked, and takes the mark back', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.openIgnoreDialog(wrapper.vm.rows.find((row) => row.name === 'Scrum'))
    wrapper.vm.confirmIgnore()
    await wrapper.vm.$nextTick()

    wrapper.vm.showIgnored = true
    await wrapper.vm.$nextTick()
    const shown = wrapper.vm.visibleRows.find((row) => row.name === 'Scrum')
    expect(shown.ignored).toBeTruthy()
    // Showing it must not put it back into the figures.
    expect(wrapper.vm.metrics.ignored).toBe(1)

    expect(wrapper.vm.includeRow(shown)).toBe(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.metrics.ignored).toBe(0)
    expect(wrapper.vm.rows.map((row) => row.name)).toContain('Scrum')
  })

  it('carries marked terms into the export instead of dropping them silently', async () => {
    const { wrapper } = mountComparison(smallWorkspace())
    wrapper.vm.openIgnoreDialog(wrapper.vm.rows.find((row) => row.name === 'Scrum'))
    wrapper.vm.ignoreReason = 'out of scope'
    wrapper.vm.confirmIgnore()
    await wrapper.vm.$nextTick()

    const data = wrapper.vm.exportData()
    expect(data.terms.map((term) => term.name)).not.toContain('Scrum')
    expect(data.ignored).toEqual([expect.objectContaining({ name: 'Scrum', reason: 'out of scope' })])
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
