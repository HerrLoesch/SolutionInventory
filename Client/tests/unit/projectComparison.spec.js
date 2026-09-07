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
})
