import { describe, it, expect } from 'vitest'
import {
  collectUnits,
  comparisonKeyOf,
  buildRows,
  isCellInconsistent,
  coverageOf,
  COVERAGE,
  deltaOf,
  effectiveAcceptances,
  staleAcceptanceProjectIds,
  ACCEPTANCE_MODES,
  DELTA,
  statusRank,
  canonicalStatus,
  maxDistance,
  classifyDistance,
  STATUS_SCALE,
  computeMetrics,
  vocabularyCoverage,
  agreementLevel,
  canOverride,
  overrideContextOf,
  isOverrideContextChanged,
  isOverrideStale,
  OVERRIDE_LEVELS,
  coverageByProject,
  unresolvedNames,
  suggestionsForName,
  exactMatchGroups,
  dismissalKey,
  buildRadarOverlay,
  layoutRadarOverlay,
  quadrantMapOf,
  quadrantLabelsOf,
  buildComparison,
  buildBaselineFromProject,
  buildBaselineFromConsensus,
  baselineStatusOf,
  computeBaselineAgreement,
  computePairwiseDivergence,
  sortRows,
  compareRows,
  projectSortColumn,
  projectIdOfSortColumn,
  SORT_COLUMN,
  DELTA_SORT_ORDER,
  STATUS_LABELS,
  OTHER_QUADRANT,
  DATA_SOURCES
} from '../../src/services/comparison'
import { buildAliasIndex } from '../../src/services/vocabulary'
import designExample from '../data/comparison/design-example-workspace.json'

// A two-project workspace whose projects use *different* catalogs — the main
// reason the comparison is term-centric rather than entry-centric (DE-1).
function makeWorkspace() {
  return {
    id: 'ws',
    vocabulary: [],
    projects: [
      {
        id: 'p-alpha',
        name: 'Alpha',
        questionnaireIds: ['q-alpha'],
        radar: [
          { entryId: 'arch', option: 'Clean Arch', category: '', status: 'Adopt' },
          { entryId: 'runtime', option: '.NET Core', category: '', status: '' }
        ]
      },
      {
        id: 'p-beta',
        name: 'Beta',
        questionnaireIds: ['q-beta'],
        radar: [{ entryId: 'pattern', option: 'Clean Arch', category: '', status: 'Trial' }]
      }
    ],
    questionnaires: [
      {
        id: 'q-alpha',
        name: 'Alpha Q',
        categories: [
          { id: 'meta', title: 'Solution', isMetadata: true, entries: [{ id: 'm', answers: [] }] },
          {
            id: 'a',
            title: 'Architecture',
            entries: [
              {
                id: 'arch',
                aspect: 'Pattern',
                answers: [{ technology: 'Clean Arch', status: 'Adopt', answerType: 'Practice' }]
              },
              {
                id: 'runtime',
                aspect: 'Runtime',
                answers: [{ technology: '.NET Core', status: 'Trial', answerType: 'Tool' }]
              },
              {
                id: 'cache',
                aspect: 'Caching',
                answers: [{ technology: 'Redis', status: 'Hold', answerType: 'Tool' }]
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
            id: 'b',
            title: 'Design',
            entries: [
              {
                id: 'pattern',
                aspect: 'Structure',
                answers: [{ technology: 'Clean Arch', status: 'Trial', answerType: 'Practice' }]
              },
              {
                id: 'runtime2',
                aspect: 'Runtime',
                answers: [{ technology: 'dotnet core', status: 'Hold', answerType: 'Tool' }]
              }
            ]
          }
        ]
      }
    ]
  }
}

const ALL = ['p-alpha', 'p-beta']

describe('DATA_SOURCES', () => {
  it('names exactly the two adapters the engine knows', () => {
    expect(DATA_SOURCES).toEqual(['radar', 'answers'])
  })
})

describe('collectUnits — radar mode', () => {
  it('yields one unit per curated blip, keyed by entry and option', () => {
    const units = collectUnits(makeWorkspace(), ALL)

    expect(units).toHaveLength(3)
    expect(units.map((unit) => unit.key)).toEqual(['arch||Clean Arch', 'runtime||.NET Core', 'pattern||Clean Arch'])
  })

  it('uses the effective status, so a blip inheriting from its answer counts as assessed (DE-7)', () => {
    const units = collectUnits(makeWorkspace(), ALL)
    const inherited = units.find((unit) => unit.rawName === '.NET Core')

    // entry.status is empty, the answer says Trial — the blip is assessed.
    expect(inherited.status).toBe('Trial')
  })

  it('keeps entry and raw spelling as provenance', () => {
    const units = collectUnits(makeWorkspace(), ALL)
    const alpha = units.find((unit) => unit.projectId === 'p-alpha' && unit.rawName === 'Clean Arch')

    expect(alpha.origin).toMatchObject({
      entryId: 'arch',
      entryTitle: 'Pattern',
      categoryTitle: 'Architecture',
      questionnaireName: 'Alpha Q',
      rawName: 'Clean Arch'
    })
  })

  it('drops blips without a name', () => {
    const workspace = makeWorkspace()
    workspace.projects[0].radar.push({ entryId: 'x', option: '   ', status: 'Adopt' })

    expect(collectUnits(workspace, ALL)).toHaveLength(3)
  })

  it('returns nothing for an unselected project, an empty selection or a project without a radar', () => {
    const workspace = makeWorkspace()

    expect(collectUnits(workspace, ['p-beta'])).toHaveLength(1)
    expect(collectUnits(workspace, [])).toEqual([])
    expect(collectUnits(workspace, ['nope'])).toEqual([])
    workspace.projects[1].radar = undefined
    expect(collectUnits(workspace, ALL)).toHaveLength(2)
  })
})

describe('collectUnits — answers mode', () => {
  it('yields one unit per answer, keyed by questionnaire, entry and technology', () => {
    const units = collectUnits(makeWorkspace(), ALL, { source: 'answers' })

    expect(units.map((unit) => unit.key)).toEqual([
      'q-alpha||arch||Clean Arch',
      'q-alpha||runtime||.NET Core',
      'q-alpha||cache||Redis',
      'q-beta||pattern||Clean Arch',
      'q-beta||runtime2||dotnet core'
    ])
  })

  it('yields more names than radar mode on the same workspace — that is the point of the mode', () => {
    const workspace = makeWorkspace()
    const radar = collectUnits(workspace, ALL)
    const answers = collectUnits(workspace, ALL, { source: 'answers' })

    expect(answers.length).toBeGreaterThan(radar.length)
    expect(answers.map((unit) => unit.rawName)).toContain('Redis')
    expect(radar.map((unit) => unit.rawName)).not.toContain('Redis')
  })

  it('takes the status straight from the answer', () => {
    const units = collectUnits(makeWorkspace(), ALL, { source: 'answers' })

    expect(units.find((unit) => unit.rawName === 'Redis').status).toBe('Hold')
    expect(units.find((unit) => unit.rawName === 'dotnet core').status).toBe('Hold')
  })

  it('uses the entry’s natural catalog category', () => {
    const units = collectUnits(makeWorkspace(), ALL, { source: 'answers' })

    expect(units.find((unit) => unit.rawName === 'Redis').origin.categoryTitle).toBe('Architecture')
    expect(units.find((unit) => unit.rawName === 'dotnet core').origin.categoryTitle).toBe('Design')
  })

  it('skips metadata categories and answers without a technology', () => {
    const workspace = makeWorkspace()
    workspace.questionnaires[0].categories[1].entries[0].answers.push({ technology: '  ', status: 'Adopt' })

    expect(collectUnits(workspace, ALL, { source: 'answers' })).toHaveLength(5)
  })

  it('collects the same name from two questionnaires of one project (DE-3 across questionnaires)', () => {
    const workspace = makeWorkspace()
    workspace.projects[0].questionnaireIds.push('q-extra')
    workspace.questionnaires.push({
      id: 'q-extra',
      name: 'Extra',
      categories: [
        {
          id: 'e',
          title: 'Data',
          entries: [{ id: 'orm', aspect: 'ORM', answers: [{ technology: 'Redis', status: 'Adopt' }] }]
        }
      ]
    })
    const redis = collectUnits(workspace, ALL, { source: 'answers' }).filter((unit) => unit.rawName === 'Redis')

    expect(redis).toHaveLength(2)
    expect(redis.map((unit) => unit.status).sort()).toEqual(['Adopt', 'Hold'])
  })

  it('falls back to radar mode for an unknown source', () => {
    const workspace = makeWorkspace()

    expect(collectUnits(workspace, ALL, { source: 'nonsense' })).toHaveLength(3)
  })
})

describe('collectUnits — kind', () => {
  it('takes the kind from the resolved term, and from answerType otherwise (DE-11)', () => {
    const workspace = makeWorkspace()
    const { index } = buildAliasIndex([{ id: 'term-ca', name: 'Clean Arch', kind: 'tool', aliases: [] }])
    const units = collectUnits(workspace, ALL, { aliasIndex: index })

    // The vocabulary says tool, the answer says Practice — the term wins.
    expect(units.find((unit) => unit.rawName === 'Clean Arch').kind).toBe('tool')
    expect(units.find((unit) => unit.rawName === '.NET Core').kind).toBe('tool')
  })

  it('is unassigned when neither the vocabulary nor the answer says anything', () => {
    const workspace = makeWorkspace()
    workspace.questionnaires[0].categories[1].entries[0].answers[0].answerType = ''
    const units = collectUnits(workspace, ['p-alpha'])

    expect(units.find((unit) => unit.rawName === 'Clean Arch').kind).toBe('unassigned')
  })
})

describe('comparisonKeyOf', () => {
  const { index } = buildAliasIndex([{ id: 'term-dotnet', name: '.NET Core', kind: 'tool', aliases: ['dotnet core'] }])

  it('keys a resolved name by term id, so two spellings meet', () => {
    expect(comparisonKeyOf('.NET Core', index).key).toBe('term:term-dotnet')
    expect(comparisonKeyOf('dotnet core', index).key).toBe('term:term-dotnet')
    expect(comparisonKeyOf('DOTNET   Core', index).key).toBe('term:term-dotnet')
  })

  it('returns the term alongside the key', () => {
    expect(comparisonKeyOf('dotnet core', index).term.name).toBe('.NET Core')
  })

  it('falls back to normalized raw text for an unresolved name (DE-2)', () => {
    const result = comparisonKeyOf('  Redis  ', index)

    expect(result.key).toBe('raw:redis')
    expect(result.term).toBeNull()
  })

  it('keeps two unresolved spellings of the same thing apart — the fallback is exact', () => {
    expect(comparisonKeyOf('postgres', index).key).not.toBe(comparisonKeyOf('PostgreSQL', index).key)
  })

  it('works without a vocabulary at all', () => {
    expect(comparisonKeyOf('Redis', null).key).toBe('raw:redis')
  })
})

describe('buildRows', () => {
  function rowsOf(workspace, vocabulary = [], options = {}) {
    const { index } = buildAliasIndex(vocabulary)
    return buildRows(collectUnits(workspace, ALL, { ...options, aliasIndex: index }), index)
  }

  it('makes one row per term, with a cell per project that uses it', () => {
    const rows = rowsOf(makeWorkspace())
    const cleanArch = rows.find((row) => row.name === 'Clean Arch')

    expect([...cleanArch.cells.keys()].sort()).toEqual(['p-alpha', 'p-beta'])
    expect(cleanArch.cells.get('p-alpha').values[0].status).toBe('Adopt')
    expect(cleanArch.cells.get('p-beta').values[0].status).toBe('Trial')
  })

  it('joins two spellings into one row once the vocabulary resolves both (DE-2)', () => {
    const vocabulary = [{ id: 'term-dotnet', name: '.NET Core', kind: 'tool', aliases: ['dotnet core'] }]
    const rows = rowsOf(makeWorkspace(), vocabulary, { source: 'answers' })
    const dotnet = rows.filter((row) => row.key === 'term:term-dotnet')

    expect(dotnet).toHaveLength(1)
    expect(dotnet[0].name).toBe('.NET Core')
    expect(dotnet[0].resolved).toBe(true)
    expect([...dotnet[0].cells.keys()].sort()).toEqual(['p-alpha', 'p-beta'])
  })

  it('keeps the two spellings apart while the vocabulary does not know them', () => {
    const rows = rowsOf(makeWorkspace(), [], { source: 'answers' })

    expect(rows.filter((row) => row.name === '.NET Core')).toHaveLength(1)
    expect(rows.filter((row) => row.name === 'dotnet core')).toHaveLength(1)
  })

  it('carries an unresolved row under its own raw text and marks it (DE-2)', () => {
    const redis = rowsOf(makeWorkspace(), [], { source: 'answers' }).find((row) => row.name === 'Redis')

    expect(redis.resolved).toBe(false)
    expect(redis.term).toBeNull()
    expect(redis.key).toBe('raw:redis')
  })

  it('keeps entry and raw-text provenance per project cell', () => {
    const vocabulary = [{ id: 'term-dotnet', name: '.NET Core', kind: 'tool', aliases: ['dotnet core'] }]
    const rows = rowsOf(makeWorkspace(), vocabulary, { source: 'answers' })
    const beta = rows.find((row) => row.key === 'term:term-dotnet').cells.get('p-beta')

    expect(beta.values[0].origin).toMatchObject({ entryId: 'runtime2', entryTitle: 'Runtime', rawName: 'dotnet core' })
  })

  it('collects several takes of one project in the same cell (DE-3)', () => {
    const workspace = makeWorkspace()
    workspace.projects[0].radar.push({ entryId: 'data', option: 'Clean Arch', status: 'Hold' })
    workspace.questionnaires[0].categories[1].entries.push({
      id: 'data',
      aspect: 'Data Access',
      answers: [{ technology: 'Clean Arch', status: 'Hold', answerType: 'Practice' }]
    })
    const alpha = rowsOf(workspace)
      .find((row) => row.name === 'Clean Arch')
      .cells.get('p-alpha')

    expect(alpha.values.map((value) => value.status)).toEqual(['Adopt', 'Hold'])
    expect(alpha.values.map((value) => value.origin.entryTitle)).toEqual(['Pattern', 'Data Access'])
  })

  it('takes the kind from whichever unit knew one', () => {
    const workspace = makeWorkspace()
    workspace.questionnaires[0].categories[1].entries[0].answers[0].answerType = ''
    const rows = rowsOf(workspace)

    // Alpha has no answerType, Beta says Practice — the row is a practice.
    expect(rows.find((row) => row.name === 'Clean Arch').kind).toBe('practice')
  })

  it('returns nothing for no units, and drops units whose name normalizes away', () => {
    expect(buildRows([], null)).toEqual([])
    expect(buildRows(undefined, null)).toEqual([])
    expect(buildRows([{ projectId: 'p', rawName: '  ', status: 'Adopt', kind: 'tool', origin: {} }], null)).toEqual([])
  })
})

describe('isCellInconsistent', () => {
  it('is true when one project rates the same term two different ways (DE-3)', () => {
    expect(isCellInconsistent({ values: [{ status: 'Adopt' }, { status: 'Hold' }] })).toBe(true)
  })

  it('is false for a duplicate that agrees with itself — that is not a contradiction', () => {
    expect(isCellInconsistent({ values: [{ status: 'Adopt' }, { status: 'adopt' }] })).toBe(false)
    expect(isCellInconsistent({ values: [{ status: 'Adopt' }, { status: '  ADOPT ' }] })).toBe(false)
  })

  it('is false for a single value or none at all', () => {
    expect(isCellInconsistent({ values: [{ status: 'Adopt' }] })).toBe(false)
    expect(isCellInconsistent({ values: [] })).toBe(false)
    expect(isCellInconsistent(undefined)).toBe(false)
  })

  it('treats "rated" versus "not rated" as a contradiction too', () => {
    expect(isCellInconsistent({ values: [{ status: 'Adopt' }, { status: '' }] })).toBe(true)
  })
})

describe('coverageOf', () => {
  // A row is just a cell map here — coverage does not care where the cells came from.
  function row(...projectIds) {
    return { cells: new Map(projectIds.map((projectId) => [projectId, { projectId, values: [{ status: 'Adopt' }] }])) }
  }

  it('classifies over two projects', () => {
    expect(coverageOf(row('a', 'b'), ['a', 'b'])).toBe(COVERAGE.ALL)
    expect(coverageOf(row('a'), ['a', 'b'])).toBe(COVERAGE.UNIQUE)
  })

  it('classifies over three projects, where partial becomes distinguishable', () => {
    const three = ['a', 'b', 'c']

    expect(coverageOf(row('a', 'b', 'c'), three)).toBe(COVERAGE.ALL)
    expect(coverageOf(row('a', 'b'), three)).toBe(COVERAGE.PARTIAL)
    expect(coverageOf(row('c'), three)).toBe(COVERAGE.UNIQUE)
  })

  it('ignores projects that are not selected', () => {
    expect(coverageOf(row('a', 'b', 'z'), ['a', 'b'])).toBe(COVERAGE.ALL)
    expect(coverageOf(row('a', 'z'), ['a', 'b'])).toBe(COVERAGE.UNIQUE)
  })

  it('treats a cell without values as absent', () => {
    const sparse = {
      cells: new Map([
        ['a', { projectId: 'a', values: [] }],
        ['b', { projectId: 'b', values: [{ status: 'Adopt' }] }]
      ])
    }

    expect(coverageOf(sparse, ['a', 'b'])).toBe(COVERAGE.UNIQUE)
  })

  it('is unique with a single selected project — nothing to compare against', () => {
    expect(coverageOf(row('a'), ['a'])).toBe(COVERAGE.UNIQUE)
  })

  it('handles an empty selection and a row without cells', () => {
    expect(coverageOf(row('a'), [])).toBe(COVERAGE.UNIQUE)
    expect(coverageOf({}, ['a', 'b'])).toBe(COVERAGE.UNIQUE)
  })
})

describe('statusRank / maxDistance / classifyDistance', () => {
  it('ranks the five-step scale in order', () => {
    expect(STATUS_SCALE).toEqual(['adopt', 'trial', 'assess', 'hold', 'retire'])
    expect(STATUS_SCALE.map(statusRank)).toEqual([0, 1, 2, 3, 4])
  })

  it('ranks case- and whitespace-insensitively', () => {
    expect(statusRank('  ADOPT ')).toBe(0)
  })

  it('reports -1 for anything not on the scale', () => {
    expect(statusRank('')).toBe(-1)
    expect(statusRank('Evaluate')).toBe(-1)
    expect(statusRank(null)).toBe(-1)
  })

  it('takes the maximum over all pairings, not an average', () => {
    // Adopt / Adopt / Retire: the pair that disagrees decides.
    expect(maxDistance([0, 0, 4])).toBe(4)
    expect(maxDistance([1, 2, 3])).toBe(2)
    expect(maxDistance([2])).toBe(0)
    expect(maxDistance([])).toBe(0)
  })

  it('classifies distances per design §6.1', () => {
    expect(classifyDistance(0)).toBe(DELTA.MATCH)
    expect(classifyDistance(1)).toBe(DELTA.MINOR)
    expect(classifyDistance(2)).toBe(DELTA.SIGNIFICANT)
    expect(classifyDistance(3)).toBe(DELTA.CRITICAL)
    expect(classifyDistance(4)).toBe(DELTA.CRITICAL)
  })
})

describe('canonicalStatus', () => {
  it('gives every spelling on the scale one display form', () => {
    expect(canonicalStatus('adopt')).toBe('Adopt')
    expect(canonicalStatus('  ADOPT ')).toBe('Adopt')
    expect(canonicalStatus('Adopt')).toBe('Adopt')
    expect(STATUS_SCALE.map(canonicalStatus)).toEqual(STATUS_LABELS)
  })

  it('leaves a status off the scale alone instead of dressing it up', () => {
    // It is already classified as ⊘ unset; making it look canonical would
    // suggest the engine understood a value it did not.
    expect(canonicalStatus('Evaluate')).toBe('Evaluate')
    expect(canonicalStatus('  Evaluate ')).toBe('Evaluate')
  })

  it('turns an absent status into an empty string, never into a scale value', () => {
    expect(canonicalStatus('')).toBe('')
    expect(canonicalStatus(null)).toBe('')
    expect(canonicalStatus(undefined)).toBe('')
  })

  it('does not change how far apart two spellings of the same status are', () => {
    expect(statusRank('adopt')).toBe(statusRank(canonicalStatus('adopt')))
  })
})

// The example matrix from design §5.3, reproduced exactly. If the design and
// the engine ever drift apart, this is where it shows.
describe('deltaOf — the design’s example rows', () => {
  const THREE = ['alpha', 'beta', 'gamma']

  // Builds a row from "project -> status or list of statuses"; a missing project
  // simply has no cell.
  function rowOf(byProject) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      const statuses = Array.isArray(status) ? status : [status]
      cells.set(projectId, { projectId, values: statuses.map((one) => ({ status: one, origin: {} })) })
    }
    return { cells }
  }

  it('React — Trial everywhere → ✓ match', () => {
    expect(deltaOf(rowOf({ alpha: 'Trial', beta: 'Trial', gamma: 'Trial' }), THREE)).toMatchObject({
      delta: DELTA.MATCH,
      distance: 0
    })
  })

  it('.NET Core — Adopt / Hold / Trial → ▲▲▲ critical', () => {
    expect(deltaOf(rowOf({ alpha: 'Adopt', beta: 'Hold', gamma: 'Trial' }), THREE)).toMatchObject({
      delta: DELTA.CRITICAL,
      distance: 3
    })
  })

  it('Docker — Adopt / Assess / Adopt → ▲▲ significant', () => {
    expect(deltaOf(rowOf({ alpha: 'Adopt', beta: 'Assess', gamma: 'Adopt' }), THREE)).toMatchObject({
      delta: DELTA.SIGNIFICANT,
      distance: 2
    })
  })

  it('Serilog — Adopt / Trial / absent → ▲ minor', () => {
    expect(deltaOf(rowOf({ alpha: 'Adopt', beta: 'Trial' }), THREE)).toMatchObject({
      delta: DELTA.MINOR,
      distance: 1
    })
  })

  it('Kafka — Adopt / unset / Adopt → ⊘ unset, and no distance at all', () => {
    const result = deltaOf(rowOf({ alpha: 'Adopt', beta: '', gamma: 'Adopt' }), THREE)

    expect(result.delta).toBe(DELTA.UNSET)
    // Not "the other two agree": dropping the unrated project would report an
    // agreement produced by omission (design §6.1).
    expect(result.distance).toBeNull()
  })

  it('EF Core — Alpha rates it twice and differently → ⚠ inconsistent, no distance', () => {
    const result = deltaOf(rowOf({ alpha: ['Adopt', 'Hold'], beta: 'Trial' }), THREE)

    expect(result.delta).toBe(DELTA.INCONSISTENT)
    expect(result.distance).toBeNull()
  })

  it('Azure DevOps — Trial / Hold with an accepted override → ✎ accepted', () => {
    const result = deltaOf(rowOf({ alpha: 'Trial', beta: 'Hold' }), THREE, { override: { level: 'accepted' } })

    expect(result.delta).toBe(DELTA.ACCEPTED)
    expect(result.distance).toBeNull()
  })

  it('Wolverine — only Gamma has it → —', () => {
    expect(deltaOf(rowOf({ gamma: 'Adopt' }), THREE)).toMatchObject({ delta: DELTA.NONE, distance: null })
  })
})

// Exactly one badge per row (design §5.3). The conditions overlap, so each
// precedence step needs a case where a lower-ranked one also applies.
describe('deltaOf — badge precedence', () => {
  const TWO = ['a', 'b']

  function rowOf(byProject) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      const statuses = Array.isArray(status) ? status : [status]
      cells.set(projectId, { projectId, values: statuses.map((one) => ({ status: one, origin: {} })) })
    }
    return { cells }
  }

  it('unique beats everything — what is not compared cannot be excluded', () => {
    const result = deltaOf(rowOf({ a: ['Adopt', ''] }), TWO, { override: { level: 'accepted' } })

    expect(result.delta).toBe(DELTA.NONE)
    // The other conditions are still reported, just not counted.
    expect(result.reasons).toEqual(expect.arrayContaining([DELTA.INCONSISTENT, DELTA.UNSET, DELTA.ACCEPTED]))
  })

  it('inconsistent beats unset — a contradiction is the more urgent finding', () => {
    const result = deltaOf(rowOf({ a: ['Adopt', 'Hold'], b: '' }), TWO)

    expect(result.delta).toBe(DELTA.INCONSISTENT)
    expect(result.reasons).toEqual([DELTA.INCONSISTENT, DELTA.UNSET])
  })

  it('inconsistent beats an accepted override — a data finding must not be hidden', () => {
    const result = deltaOf(rowOf({ a: ['Adopt', 'Hold'], b: 'Trial' }), TWO, { override: { level: 'accepted' } })

    expect(result.delta).toBe(DELTA.INCONSISTENT)
  })

  it('unset beats an accepted override', () => {
    const result = deltaOf(rowOf({ a: 'Adopt', b: '' }), TWO, { override: { level: 'accepted' } })

    expect(result.delta).toBe(DELTA.UNSET)
  })

  it('an accepted override beats the computed distance', () => {
    expect(deltaOf(rowOf({ a: 'Adopt', b: 'Retire' }), TWO, { override: { level: 'accepted' } }).delta).toBe(
      DELTA.ACCEPTED
    )
  })

  it('an upgrade to critical stays in the distance branch and reports the real distance', () => {
    const result = deltaOf(rowOf({ a: 'Adopt', b: 'Trial' }), TWO, { override: { level: 'critical' } })

    expect(result.delta).toBe(DELTA.CRITICAL)
    expect(result.distance).toBe(1)
    // Not an exclusion reason — it stays in Comparable (design §6.2).
    expect(result.reasons).toEqual([])
  })
})

describe('deltaOf — edge cases', () => {
  const TWO = ['a', 'b']

  function rowOf(byProject) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      const statuses = Array.isArray(status) ? status : [status]
      cells.set(projectId, { projectId, values: statuses.map((one) => ({ status: one, origin: {} })) })
    }
    return { cells }
  }

  it('treats an off-scale status as unset rather than inventing a distance', () => {
    const result = deltaOf(rowOf({ a: 'Adopt', b: 'Evaluate' }), TWO)

    expect(result.delta).toBe(DELTA.UNSET)
    expect(result.distance).toBeNull()
  })

  it('does not call a duplicate that agrees with itself inconsistent', () => {
    expect(deltaOf(rowOf({ a: ['Adopt', 'Adopt'], b: 'Adopt' }), TWO).delta).toBe(DELTA.MATCH)
  })

  it('accepts a precomputed coverage instead of deriving it again', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })

    expect(deltaOf(row, TWO, { coverage: COVERAGE.UNIQUE }).delta).toBe(DELTA.NONE)
    expect(deltaOf(row, TWO, { coverage: COVERAGE.ALL }).delta).toBe(DELTA.CRITICAL)
  })

  it('ignores projects outside the selection', () => {
    const row = rowOf({ a: 'Adopt', b: 'Adopt', z: 'Retire' })

    expect(deltaOf(row, TWO).delta).toBe(DELTA.MATCH)
  })

  it('handles a row with no cells at all', () => {
    expect(deltaOf({ cells: new Map() }, TWO)).toMatchObject({ delta: DELTA.NONE, distance: null })
  })
})

// Shared row builder for the metric tests: "project -> status(es)".
function metricRow(key, byProject, term = null) {
  const cells = new Map()
  for (const [projectId, status] of Object.entries(byProject)) {
    const statuses = Array.isArray(status) ? status : [status]
    cells.set(projectId, { projectId, values: statuses.map((one) => ({ status: one, origin: {} })) })
  }
  return { key, term, name: key, resolved: Boolean(term), kind: 'tool', cells }
}

describe('agreementLevel', () => {
  it('classifies per design §5.2', () => {
    expect(agreementLevel(100)).toBe('high')
    expect(agreementLevel(85)).toBe('high')
    expect(agreementLevel(84)).toBe('moderate')
    expect(agreementLevel(65)).toBe('moderate')
    expect(agreementLevel(64)).toBe('low')
    expect(agreementLevel(0)).toBe('low')
  })
})

describe('vocabularyCoverage', () => {
  const { index } = buildAliasIndex([{ id: 'term-dotnet', name: '.NET Core', kind: 'tool', aliases: ['dotnet core'] }])
  const unitsOf = (...names) => names.map((rawName) => ({ rawName }))

  it('counts distinct *names*, not distinct terms — two spellings of one term are two names', () => {
    expect(vocabularyCoverage(unitsOf('.NET Core', 'dotnet core', 'Redis'), index)).toEqual({
      total: 3,
      resolved: 2,
      unresolved: 1,
      percent: 67
    })
  })

  it('counts a name only once however often it occurs', () => {
    expect(vocabularyCoverage(unitsOf('Redis', 'redis', '  REDIS  '), index).total).toBe(1)
  })

  it('is 100 % for an empty set — nothing is unresolved', () => {
    expect(vocabularyCoverage([], index).percent).toBe(100)
  })

  it('is 0 % without a vocabulary', () => {
    expect(vocabularyCoverage(unitsOf('Redis', 'Kafka'), null)).toEqual({
      total: 2,
      resolved: 0,
      unresolved: 2,
      percent: 0
    })
  })

  it('ignores names that normalize away', () => {
    expect(vocabularyCoverage(unitsOf('  ', 'Redis'), index).total).toBe(1)
  })
})

describe('computeMetrics', () => {
  const TWO = ['a', 'b']
  const THREE = ['a', 'b', 'c']

  it('counts coverage, and breaks unique down per project', () => {
    const rows = [
      metricRow('t1', { a: 'Adopt', b: 'Adopt', c: 'Adopt' }),
      metricRow('t2', { a: 'Adopt', b: 'Trial' }),
      metricRow('t3', { a: 'Adopt' }),
      metricRow('t4', { c: 'Adopt' })
    ]
    const metrics = computeMetrics(rows, THREE)

    expect(metrics).toMatchObject({ total: 4, all: 1, partial: 1, unique: 2, compared: 2 })
    expect(metrics.uniqueByProject).toEqual({ a: 1, b: 0, c: 1 })
    expect(metrics.allPercent).toBe(25)
  })

  it('distributes the comparable terms and computes agreement', () => {
    const rows = [
      metricRow('match', { a: 'Adopt', b: 'Adopt' }),
      metricRow('minor', { a: 'Adopt', b: 'Trial' }),
      metricRow('significant', { a: 'Adopt', b: 'Assess' }),
      metricRow('critical', { a: 'Adopt', b: 'Retire' })
    ]
    const metrics = computeMetrics(rows, TWO)

    expect(metrics).toMatchObject({
      compared: 4,
      excluded: 0,
      comparable: 4,
      matches: 1,
      minor: 1,
      significant: 1,
      critical: 1,
      agreementPercent: 25,
      agreementLevel: 'low'
    })
  })

  it('counts the three exclusion reasons separately', () => {
    const term = { id: 'term-x', name: 'X', kind: 'tool', aliases: [] }
    const rows = [
      metricRow('unset', { a: 'Adopt', b: '' }),
      metricRow('inconsistent', { a: ['Adopt', 'Hold'], b: 'Trial' }),
      metricRow('accepted', { a: 'Adopt', b: 'Retire' }, term),
      metricRow('match', { a: 'Adopt', b: 'Adopt' })
    ]
    const metrics = computeMetrics(rows, TWO, { overrides: { 'term-x': { level: 'accepted' } } })

    expect(metrics).toMatchObject({ compared: 4, unset: 1, inconsistent: 1, accepted: 1, excluded: 3, comparable: 1 })
  })

  // The three invariants from DE-8, checked on a mixed set rather than on a
  // hand-picked one — this is where an off-by-one in the counting would show.
  describe('invariants (DE-8)', () => {
    const term = { id: 'term-acc', name: 'Accepted', kind: 'tool', aliases: [] }
    const rows = [
      metricRow('match1', { a: 'Adopt', b: 'Adopt', c: 'Adopt' }),
      metricRow('match2', { a: 'Trial', b: 'Trial' }),
      metricRow('minor', { a: 'Adopt', b: 'Trial', c: 'Adopt' }),
      metricRow('significant', { a: 'Adopt', b: 'Assess' }),
      metricRow('critical', { a: 'Adopt', b: 'Retire', c: 'Trial' }),
      metricRow('unset', { a: 'Adopt', b: '', c: 'Adopt' }),
      metricRow('inconsistent', { a: ['Adopt', 'Hold'], b: 'Trial' }),
      metricRow('accepted', { a: 'Trial', b: 'Hold' }, term),
      // Unique *and* internally inconsistent *and* partly unrated — the case
      // DE-8 singles out. None of it may reach `excluded`.
      metricRow('uniqueMessy', { c: ['Adopt', ''] }),
      metricRow('uniquePlain', { a: 'Adopt' })
    ]
    const metrics = computeMetrics(rows, THREE, { overrides: { 'term-acc': { level: 'accepted' } } })

    it('1. matches + minor + significant + critical === comparable', () => {
      expect(metrics.matches + metrics.minor + metrics.significant + metrics.critical).toBe(metrics.comparable)
    })

    it('2. excluded counts only within compared — never a unique term', () => {
      expect(metrics.unique).toBe(2)
      expect(metrics.compared).toBe(8)
      expect(metrics.compared + metrics.unique).toBe(metrics.total)
      expect(metrics.excluded).toBeLessThanOrEqual(metrics.compared)
      // The messy unique row contributes to neither excluded nor comparable.
      expect(metrics.inconsistent).toBe(1)
      expect(metrics.unset).toBe(1)
    })

    it('3. unset + inconsistent + accepted === excluded, exactly', () => {
      expect(metrics.unset + metrics.inconsistent + metrics.accepted).toBe(metrics.excluded)
      expect(metrics.comparable).toBe(metrics.compared - metrics.excluded)
    })
  })

  it('ignores an override whose term is not in this comparison', () => {
    const rows = [metricRow('match', { a: 'Adopt', b: 'Adopt' })]
    const metrics = computeMetrics(rows, TWO, { overrides: { 'term-elsewhere': { level: 'accepted' } } })

    expect(metrics).toMatchObject({ accepted: 0, matches: 1, comparable: 1 })
  })

  it('never divides by zero', () => {
    const empty = computeMetrics([], TWO)

    expect(empty).toMatchObject({ total: 0, allPercent: 0, agreementPercent: 0, agreementLevel: 'low' })

    const uniqueOnly = computeMetrics([metricRow('u', { a: 'Adopt' })], TWO)
    expect(uniqueOnly).toMatchObject({ comparable: 0, agreementPercent: 0 })
  })

  it('carries the vocabulary coverage through untouched when handed one', () => {
    const coverage = { total: 10, resolved: 8, unresolved: 2, percent: 80 }

    expect(computeMetrics([], TWO, { vocabulary: coverage }).vocabulary).toEqual(coverage)
  })
})

// The example dataset from design §5.2, as a fixture. Its only job is to hold
// the design document and the engine together: if either drifts, this test
// names the exact figure that moved.
describe('the design’s example dataset', () => {
  const PROJECTS = ['project-alpha', 'project-beta', 'project-gamma']

  function metricsOf(source) {
    const { index } = buildAliasIndex(designExample.vocabulary)
    const units = collectUnits(designExample, PROJECTS, { source, aliasIndex: index })
    const rows = buildRows(units, index)
    return computeMetrics(rows, PROJECTS, {
      overrides: designExample.comparisonOverrides,
      vocabulary: vocabularyCoverage(units, index)
    })
  }

  it('reproduces every figure from design §5.2 exactly', () => {
    expect(metricsOf('radar')).toMatchObject({
      total: 38,
      all: 24,
      partial: 8,
      unique: 6,
      allPercent: 63,
      compared: 32,
      excluded: 5,
      unset: 2,
      inconsistent: 1,
      accepted: 2,
      comparable: 27,
      matches: 20,
      minor: 4,
      significant: 2,
      critical: 1,
      agreementPercent: 74,
      agreementLevel: 'moderate'
    })
  })

  it('reproduces the vocabulary coverage — 82 % with 13 unresolved names', () => {
    expect(metricsOf('radar').vocabulary).toEqual({ total: 72, resolved: 59, unresolved: 13, percent: 82 })
  })

  it('satisfies the three DE-8 invariants on the real dataset', () => {
    const metrics = metricsOf('radar')

    expect(metrics.matches + metrics.minor + metrics.significant + metrics.critical).toBe(metrics.comparable)
    expect(metrics.compared + metrics.unique).toBe(metrics.total)
    expect(metrics.unset + metrics.inconsistent + metrics.accepted).toBe(metrics.excluded)
  })

  it('runs in the answers mode too — the fixture mirrors its radar in the questionnaires', () => {
    // Same figures here only because the fixture was built that way; the point
    // is that the second adapter is exercised, not left as a dead option.
    expect(metricsOf('answers')).toMatchObject({ total: 38, compared: 32, comparable: 27, agreementPercent: 74 })
  })

  it('is a v3-shaped workspace carrying the three additive fields', () => {
    expect(Array.isArray(designExample.vocabulary)).toBe(true)
    expect(Array.isArray(designExample.dismissedSuggestions)).toBe(true)
    expect(Object.keys(designExample.comparisonOverrides)).toHaveLength(2)
  })
})

// DE-5: an override belongs to a term, is valid workspace-wide, and may only be
// set where there is an automatic classification to override.
describe('criticality overrides', () => {
  it('is not offered where the reference gives nothing to classify', () => {
    const row = { key: 'term:x', name: 'X', resolved: true, term: { id: 'x' }, cells: new Map() }

    // There is no automatic classification to override on a row the reference
    // does not list, or on a target no project uses.
    expect(canOverride(row, DELTA.UNLISTED)).toBe(false)
    expect(canOverride(row, DELTA.MISSING)).toBe(false)
    // A silent acceptance *is* a classification, so that one stays overridable.
    expect(canOverride(row, DELTA.SILENT)).toBe(true)
  })

  const TWO = ['a', 'b']
  const term = { id: 'term-x', name: 'X', kind: 'tool', aliases: [] }

  function rowOf(byProject, resolved = true) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      const statuses = Array.isArray(status) ? status : [status]
      cells.set(projectId, { projectId, values: statuses.map((one) => ({ status: one, origin: {} })) })
    }
    return { key: resolved ? 'term:term-x' : 'raw:x', term: resolved ? term : null, resolved, name: 'X', cells }
  }

  it('names the two levels the design defines', () => {
    expect(OVERRIDE_LEVELS).toEqual(['accepted', 'critical'])
  })

  describe('canOverride', () => {
    it('allows it on a resolved, comparable row', () => {
      const row = rowOf({ a: 'Adopt', b: 'Retire' })

      expect(canOverride(row, deltaOf(row, TWO).delta)).toBe(true)
    })

    it('refuses it on an unresolved row — the UI offers the assignment first', () => {
      const row = rowOf({ a: 'Adopt', b: 'Retire' }, false)

      expect(canOverride(row, deltaOf(row, TWO).delta)).toBe(false)
    })

    it('refuses it on unique, inconsistent and unset rows — there is nothing to override', () => {
      const unique = rowOf({ a: 'Adopt' })
      const inconsistent = rowOf({ a: ['Adopt', 'Hold'], b: 'Trial' })
      const unset = rowOf({ a: 'Adopt', b: '' })

      expect(canOverride(unique, deltaOf(unique, TWO).delta)).toBe(false)
      expect(canOverride(inconsistent, deltaOf(inconsistent, TWO).delta)).toBe(false)
      expect(canOverride(unset, deltaOf(unset, TWO).delta)).toBe(false)
    })

    it('allows it on a matching row too — accepting agreement is pointless but not wrong', () => {
      const row = rowOf({ a: 'Adopt', b: 'Adopt' })

      expect(canOverride(row, deltaOf(row, TWO).delta)).toBe(true)
    })
  })

  describe('overrideContextOf', () => {
    it('records the participating projects and their statuses', () => {
      expect(overrideContextOf(rowOf({ a: 'Trial', b: 'Hold' }), TWO)).toEqual({
        contextProjects: ['a', 'b'],
        contextStatuses: { a: 'Trial', b: 'Hold' }
      })
    })

    it('leaves out a project that does not use the term', () => {
      expect(overrideContextOf(rowOf({ a: 'Trial' }), TWO)).toEqual({
        contextProjects: ['a'],
        contextStatuses: { a: 'Trial' }
      })
    })
  })

  describe('isOverrideContextChanged', () => {
    const row = rowOf({ a: 'Trial', b: 'Hold' })
    const stored = { level: 'accepted', contextProjects: ['a', 'b'], contextStatuses: { a: 'Trial', b: 'Hold' } }

    it('is false while nothing moved', () => {
      expect(isOverrideContextChanged(stored, row, TWO)).toBe(false)
    })

    it('is false when only the spelling of a status changed', () => {
      expect(isOverrideContextChanged({ ...stored, contextStatuses: { a: 'trial', b: ' HOLD ' } }, row, TWO)).toBe(
        false
      )
    })

    it('is true when a status changed', () => {
      expect(isOverrideContextChanged(stored, rowOf({ a: 'Trial', b: 'Retire' }), TWO)).toBe(true)
    })

    it('is true when a project joined or left', () => {
      expect(isOverrideContextChanged(stored, rowOf({ a: 'Trial' }), TWO)).toBe(true)
      expect(isOverrideContextChanged({ ...stored, contextProjects: ['a'] }, row, TWO)).toBe(true)
    })

    it('is false without an override at all', () => {
      expect(isOverrideContextChanged(null, row, TWO)).toBe(false)
    })
  })

  describe('isOverrideStale', () => {
    const stored = { level: 'accepted', contextProjects: ['a', 'b'], contextStatuses: { a: 'Trial', b: 'Hold' } }

    it('is false while the row still qualifies and the context holds', () => {
      const row = rowOf({ a: 'Trial', b: 'Hold' })

      expect(isOverrideStale(stored, row, deltaOf(row, TWO, { override: stored }).delta, TWO)).toBe(false)
    })

    it('is true once the row tipped into inconsistent — the override is kept but overruled', () => {
      const row = rowOf({ a: ['Trial', 'Adopt'], b: 'Hold' })
      const { delta } = deltaOf(row, TWO, { override: stored })

      expect(delta).toBe(DELTA.INCONSISTENT)
      expect(isOverrideStale(stored, row, delta, TWO)).toBe(true)
    })

    it('is true once the row tipped into unset', () => {
      const row = rowOf({ a: 'Trial', b: '' })
      const { delta } = deltaOf(row, TWO, { override: stored })

      expect(delta).toBe(DELTA.UNSET)
      expect(isOverrideStale(stored, row, delta, TWO)).toBe(true)
    })

    it('is true when only the context moved, while the override still applies', () => {
      const row = rowOf({ a: 'Trial', b: 'Retire' })
      const { delta } = deltaOf(row, TWO, { override: stored })

      expect(delta).toBe(DELTA.ACCEPTED)
      expect(isOverrideStale(stored, row, delta, TWO)).toBe(true)
    })
  })

  it('never lets a term count in two exclusion reasons, even with a stale override', () => {
    const row = rowOf({ a: ['Trial', 'Adopt'], b: '' })
    const override = { level: 'accepted', contextProjects: ['a', 'b'], contextStatuses: {} }
    const result = deltaOf(row, TWO, { override })

    expect(result.delta).toBe(DELTA.INCONSISTENT)
    expect(result.reasons).toEqual([DELTA.INCONSISTENT, DELTA.UNSET, DELTA.ACCEPTED])
  })
})

describe('coverageByProject', () => {
  const { index } = buildAliasIndex([{ id: 'term-vue', name: 'Vue', kind: 'tool', aliases: [] }])
  const units = [
    { projectId: 'a', rawName: 'Vue' },
    { projectId: 'a', rawName: 'Vue' },
    { projectId: 'a', rawName: 'Kafka' },
    { projectId: 'b', rawName: 'Vue' }
  ]

  it('counts names, not units — ten blips with one unknown spelling are one problem', () => {
    expect(coverageByProject(units, index, ['a', 'b'])).toEqual({
      a: { total: 2, resolved: 1, unresolved: 1, percent: 50 },
      b: { total: 1, resolved: 1, unresolved: 0, percent: 100 }
    })
  })

  it('reports 100 % for a project without any names', () => {
    expect(coverageByProject(units, index, ['a', 'z']).z).toEqual({
      total: 0,
      resolved: 0,
      unresolved: 0,
      percent: 100
    })
  })

  it('ignores units of projects outside the selection', () => {
    expect(Object.keys(coverageByProject(units, index, ['a']))).toEqual(['a'])
  })
})

describe('unresolvedNames', () => {
  const { index } = buildAliasIndex([{ id: 'term-vue', name: 'Vue', kind: 'tool', aliases: [] }])

  it('groups spellings by their normalized form and keeps who uses which', () => {
    const groups = unresolvedNames(
      [
        { projectId: 'b', rawName: 'postgres', kind: 'tool', origin: {} },
        { projectId: 'c', rawName: 'Postgres', kind: 'unassigned', origin: {} },
        { projectId: 'a', rawName: 'Vue', kind: 'tool', origin: {} }
      ],
      index
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('postgres')
    expect(groups[0].spellings.map((spelling) => spelling.rawName)).toEqual(['postgres', 'Postgres'])
    expect(groups[0].spellings[0].projectIds).toEqual(['b'])
  })

  it('takes the best kind any unit knew', () => {
    const groups = unresolvedNames(
      [
        { projectId: 'a', rawName: 'Kafka', kind: 'unassigned', origin: {} },
        { projectId: 'b', rawName: 'kafka', kind: 'tool', origin: {} }
      ],
      index
    )

    expect(groups[0].kind).toBe('tool')
  })

  it('leaves out everything the vocabulary already resolves', () => {
    expect(unresolvedNames([{ projectId: 'a', rawName: 'Vue', kind: 'tool', origin: {} }], index)).toEqual([])
  })
})

describe('suggestionsForName', () => {
  const vocabulary = [{ id: 'term-dotnet', name: '.NET Core', kind: 'tool', aliases: [] }]

  it('suggests a similar term', () => {
    expect(suggestionsForName('dotnet core', vocabulary).map((s) => s.term.id)).toEqual(['term-dotnet'])
  })

  it('drops a pair the user dismissed, in either order', () => {
    expect(suggestionsForName('dotnet core', vocabulary, [dismissalKey('dotnet core', '.NET Core')])).toEqual([])
    expect(suggestionsForName('dotnet core', vocabulary, [dismissalKey('.NET Core', 'dotnet core')])).toEqual([])
  })

  it('keeps other suggestions when one pair is dismissed', () => {
    const two = [...vocabulary, { id: 'term-dotnet-fw', name: '.NET Framework', kind: 'tool', aliases: [] }]

    expect(suggestionsForName('dotnet framework', two, [dismissalKey('dotnet framework', '.NET Core')]).length).toBe(1)
  })
})

describe('exactMatchGroups', () => {
  it('picks the groups that differ only in case or whitespace', () => {
    const units = [
      { projectId: 'a', rawName: 'Serilog ', kind: 'tool', origin: {} },
      { projectId: 'b', rawName: 'Serilog', kind: 'tool', origin: {} },
      { projectId: 'a', rawName: 'Kafka', kind: 'tool', origin: {} }
    ]

    expect(exactMatchGroups(units, null).map((group) => group.key)).toEqual(['serilog'])
  })

  it('leaves out a group whose kind is still unassigned — kind is never guessed', () => {
    const units = [
      { projectId: 'a', rawName: 'Serilog ', kind: 'unassigned', origin: {} },
      { projectId: 'b', rawName: 'Serilog', kind: 'unassigned', origin: {} }
    ]

    expect(exactMatchGroups(units, null)).toEqual([])
  })

  it('leaves out a name that appears in only one spelling — nothing to reconcile', () => {
    const units = [
      { projectId: 'a', rawName: 'Serilog', kind: 'tool', origin: {} },
      { projectId: 'b', rawName: 'Serilog', kind: 'tool', origin: {} }
    ]

    expect(exactMatchGroups(units, null)).toEqual([])
  })
})

// F3 — one project going along with another. Not the ✎ override: this keeps the
// term in Comparable and counts it as a match, because agreement reached is
// still agreement.
describe('deltaOf — silent acceptance', () => {
  const TWO = ['a', 'b']
  const THREE = ['a', 'b', 'c']

  function rowOf(byProject) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      if (status === null) continue
      cells.set(projectId, {
        projectId,
        values: [].concat(status).map((entry) => ({ status: entry, origin: { rawName: 'x' } }))
      })
    }
    return { key: 'term:x', name: 'X', term: { id: 'x' }, resolved: true, cells }
  }

  it('turns an accepted absence into agreement rather than an uncompared row', () => {
    const row = rowOf({ a: 'Adopt' })

    expect(deltaOf(row, TWO).delta).toBe(DELTA.NONE)
    const result = deltaOf(row, TWO, { acceptances: { b: { mode: 'absence' } } })
    expect(result).toMatchObject({ delta: DELTA.SILENT, distance: 0 })
    expect(result.reasons).toContain(DELTA.SILENT)
  })

  it('lets a project take another’s status, so the difference stops counting', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })

    expect(deltaOf(row, TWO).delta).toBe(DELTA.CRITICAL)
    expect(deltaOf(row, TWO, { acceptances: { b: { mode: 'status', acceptedFrom: 'a' } } })).toMatchObject({
      delta: DELTA.SILENT,
      distance: 0
    })
  })

  it('does not let two projects settling their difference hide a third that has not', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire', c: 'Assess' })

    const result = deltaOf(row, THREE, { acceptances: { b: { mode: 'status', acceptedFrom: 'a' } } })

    // b now reads as Adopt, but c still says Assess — distance 2 remains.
    expect(result).toMatchObject({ delta: DELTA.SIGNIFICANT, distance: 2 })
    expect(result.reasons).toContain(DELTA.SILENT)
  })

  it('drops an absence acceptance once the project forms an opinion of its own', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })

    // The stored decision was about an absence that no longer exists.
    expect(deltaOf(row, TWO, { acceptances: { b: { mode: 'absence' } } }).delta).toBe(DELTA.CRITICAL)
  })

  it('ignores a status accepted from a project that is not in the selection', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })

    expect(deltaOf(row, TWO, { acceptances: { b: { mode: 'status', acceptedFrom: 'z' } } }).delta).toBe(DELTA.CRITICAL)
    expect(deltaOf(row, TWO, { acceptances: { b: { mode: 'status', acceptedFrom: 'b' } } }).delta).toBe(DELTA.CRITICAL)
  })

  it('never lets an acceptance outrank a data finding', () => {
    // ⚠ two contradictory takes inside one project …
    const inconsistent = rowOf({ a: ['Adopt', 'Retire'], b: 'Adopt' })
    expect(deltaOf(inconsistent, TWO, { acceptances: { b: { mode: 'status', acceptedFrom: 'a' } } }).delta).toBe(
      DELTA.INCONSISTENT
    )

    // ⊘ a missing status …
    const unset = rowOf({ a: '', b: 'Adopt' })
    expect(deltaOf(unset, TWO, { acceptances: { b: { mode: 'status', acceptedFrom: 'a' } } }).delta).toBe(DELTA.UNSET)

    // … and the explicit override outranks the silent decision.
    const differing = rowOf({ a: 'Adopt', b: 'Retire' })
    expect(
      deltaOf(differing, TWO, {
        override: { level: 'accepted' },
        acceptances: { b: { mode: 'status', acceptedFrom: 'a' } }
      }).delta
    ).toBe(DELTA.ACCEPTED)
  })

  it('keeps a critical upgrade critical', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })

    expect(
      deltaOf(row, TWO, {
        override: { level: 'critical' },
        acceptances: { b: { mode: 'status', acceptedFrom: 'a' } }
      }).delta
    ).toBe(DELTA.CRITICAL)
  })

  it('needs somebody to actually be there — an absence accepting an absence is nothing', () => {
    const row = rowOf({})

    expect(deltaOf(row, TWO, { acceptances: { a: { mode: 'absence' }, b: { mode: 'absence' } } }).delta).toBe(
      DELTA.NONE
    )
  })

  it('reports only the acceptances that are in force', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })
    const applied = effectiveAcceptances(row, TWO, {
      b: { mode: 'status', acceptedFrom: 'a' },
      a: { mode: 'absence' },
      z: { mode: 'absence' }
    })

    // a has a value, so its absence acceptance does not apply; z is not selected.
    expect([...applied.keys()]).toEqual(['b'])
  })
})

describe('staleAcceptanceProjectIds', () => {
  const TWO = ['a', 'b']

  function rowOf(byProject) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      cells.set(projectId, { projectId, values: [{ status, origin: { rawName: 'x' } }] })
    }
    return { key: 'term:x', name: 'X', term: { id: 'x' }, cells }
  }

  it('names the two modes the engine knows', () => {
    expect(ACCEPTANCE_MODES).toEqual(['absence', 'status'])
  })

  it('reports nothing while the decision still fits the data', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })
    const acceptances = {
      b: { mode: 'status', acceptedFrom: 'a', contextProjects: ['a', 'b'], contextStatuses: { a: 'Adopt', b: 'Retire' } }
    }

    expect(staleAcceptanceProjectIds(row, TWO, acceptances)).toEqual([])
  })

  it('flags a decision the data has moved past', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })
    // The absence it was taken about is gone — b has an opinion now.
    expect(staleAcceptanceProjectIds(row, TWO, { b: { mode: 'absence' } })).toEqual(['b'])
  })

  it('flags a decision whose context has changed, without dropping it', () => {
    const row = rowOf({ a: 'Trial', b: 'Retire' })
    const acceptances = {
      b: { mode: 'status', acceptedFrom: 'a', contextProjects: ['a', 'b'], contextStatuses: { a: 'Adopt', b: 'Retire' } }
    }

    // Still in force — but a says something else now than when this was decided.
    expect(effectiveAcceptances(row, TWO, acceptances).has('b')).toBe(true)
    expect(staleAcceptanceProjectIds(row, TWO, acceptances)).toEqual(['b'])
  })

  it('says nothing about a project outside the selection', () => {
    const row = rowOf({ a: 'Adopt', b: 'Retire' })

    expect(staleAcceptanceProjectIds(row, ['a'], { b: { mode: 'absence' } })).toEqual([])
  })
})

describe('computeMetrics — silent acceptance', () => {
  const TWO = ['a', 'b']

  function rowOf(key, byProject) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      cells.set(projectId, { projectId, values: [{ status, origin: { rawName: key } }] })
    }
    return { key, name: key, term: { id: key }, resolved: true, cells }
  }

  it('counts a silent acceptance as a match and reports it separately', () => {
    const rows = [rowOf('term:x', { a: 'Adopt', b: 'Retire' })]

    const before = computeMetrics(rows, TWO)
    expect(before).toMatchObject({ compared: 1, comparable: 1, matches: 0, critical: 1, silent: 0 })

    const after = computeMetrics(rows, TWO, {
      acceptances: { 'term:x': { b: { mode: 'status', acceptedFrom: 'a' } } }
    })
    expect(after).toMatchObject({ compared: 1, comparable: 1, matches: 1, critical: 0, silent: 1 })
    expect(after.agreementPercent).toBe(100)
  })

  it('keeps the class counts adding up to comparable', () => {
    const rows = [
      rowOf('term:x', { a: 'Adopt', b: 'Retire' }),
      rowOf('term:y', { a: 'Adopt', b: 'Trial' }),
      rowOf('term:z', { a: 'Hold', b: 'Hold' })
    ]

    const metrics = computeMetrics(rows, TWO, {
      acceptances: { 'term:x': { b: { mode: 'status', acceptedFrom: 'a' } } }
    })

    expect(metrics.matches + metrics.minor + metrics.significant + metrics.critical).toBe(metrics.comparable)
    expect(metrics.silent).toBeLessThanOrEqual(metrics.matches)
  })

  it('brings an accepted absence into `compared` while coverage still says unique', () => {
    const rows = [rowOf('term:x', { a: 'Adopt' })]

    const metrics = computeMetrics(rows, TWO, { acceptances: { 'term:x': { b: { mode: 'absence' } } } })

    // The fact stays: only one project rates it. The reading changes.
    expect(metrics.unique).toBe(1)
    expect(metrics).toMatchObject({ compared: 1, comparable: 1, matches: 1, silent: 1 })
  })
})

// F1 — a term marked "not important" leaves the comparison completely: it is a
// decision about the question, not a filter over the answer.
describe('buildComparison — terms marked not important', () => {
  function workspaceWithIgnored(ignored) {
    return { ...makeWorkspace(), comparisonIgnored: ignored }
  }

  it('keeps every row when nothing is marked', () => {
    const comparison = buildComparison(makeWorkspace(), ALL)

    expect(comparison.ignoredRows).toEqual([])
    expect(comparison.metrics.ignored).toBe(0)
    expect(comparison.rows.map((row) => row.name).sort()).toEqual(['.NET Core', 'Clean Arch'])
  })

  it('moves a marked row out of the rows and into ignoredRows', () => {
    const comparison = buildComparison(workspaceWithIgnored({ 'raw:clean arch': { reason: 'legacy' } }), ALL)

    expect(comparison.rows.map((row) => row.name)).toEqual(['.NET Core'])
    expect(comparison.ignoredRows.map((row) => row.name)).toEqual(['Clean Arch'])
    expect(comparison.ignoredRows[0].ignored).toEqual({ reason: 'legacy' })
  })

  it('takes the row out of every metric, `total` included', () => {
    const before = buildComparison(makeWorkspace(), ALL).metrics
    const after = buildComparison(workspaceWithIgnored({ 'raw:clean arch': { reason: '' } }), ALL).metrics

    expect(after.total).toBe(before.total - 1)
    expect(after.ignored).toBe(1)
    // Clean Arch was the one compared row; without it nothing is compared.
    expect(after.compared).toBe(before.compared - 1)
    expect(after.matches + after.minor + after.significant + after.critical).toBe(after.comparable)
  })

  it('marks by row key, so an unresolved row can be marked too', () => {
    // No vocabulary here, so both rows are keyed by their normalized text.
    const comparison = buildComparison(workspaceWithIgnored({ 'raw:.net core': { reason: '' } }), ALL)

    expect(comparison.ignoredRows.map((row) => row.resolved)).toEqual([false])
    expect(comparison.rows.map((row) => row.name)).toEqual(['Clean Arch'])
  })

  it('never flags an ignored row as a possible false difference', () => {
    // ⁉ marks a difference that may not be real; a row that is out of the
    // comparison is not a difference at all.
    const comparison = buildComparison(workspaceWithIgnored({ 'raw:clean arch': { reason: '' } }), ALL)

    expect(comparison.ignoredRows.every((row) => !row.possibleFalseDifference)).toBe(true)
  })

  it('ignores a key that matches no row instead of failing', () => {
    const comparison = buildComparison(workspaceWithIgnored({ 'term:gone': { reason: '' } }), ALL)

    expect(comparison.ignoredRows).toEqual([])
    expect(comparison.metrics.ignored).toBe(0)
  })
})

// F8 — who is apart from whom. The single agreement figure cannot say that:
// two identical projects and a third far out read like three that each drift.
describe('computePairwiseDivergence', () => {
  const THREE = ['a', 'b', 'c']

  function rowOf(key, byProject) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      cells.set(projectId, {
        projectId,
        values: [].concat(status).map((entry) => ({ status: entry, origin: { rawName: key } }))
      })
    }
    return { key, name: key, term: { id: key }, cells }
  }

  it('reports 0 % for two projects that say the same thing', () => {
    const rows = [rowOf('term:x', { a: 'Adopt', b: 'Adopt' }), rowOf('term:y', { a: 'Hold', b: 'Hold' })]

    expect(computePairwiseDivergence(rows, ['a', 'b'])).toEqual([
      { a: 'a', b: 'b', percent: 0, comparedRows: 2, byClass: { match: 2, minor: 0, significant: 0, critical: 0 } }
    ])
  })

  it('reports 100 % when every term sits at opposite ends of the scale', () => {
    const rows = [rowOf('term:x', { a: 'Adopt', b: 'Retire' }), rowOf('term:y', { a: 'Retire', b: 'Adopt' })]

    expect(computePairwiseDivergence(rows, ['a', 'b'])[0]).toMatchObject({ percent: 100, comparedRows: 2 })
  })

  it('averages the distance over the rows, not over the projects', () => {
    // Adopt/Adopt (0) and Adopt/Assess (2) → 2 / (2 rows × 4) = 25 %.
    const rows = [rowOf('term:x', { a: 'Adopt', b: 'Adopt' }), rowOf('term:y', { a: 'Adopt', b: 'Assess' })]

    expect(computePairwiseDivergence(rows, ['a', 'b'])[0]).toMatchObject({
      percent: 25,
      comparedRows: 2,
      byClass: { match: 1, minor: 0, significant: 1, critical: 0 }
    })
  })

  it('gives one entry per pair, not one per project', () => {
    const rows = [rowOf('term:x', { a: 'Adopt', b: 'Adopt', c: 'Retire' })]

    const pairs = computePairwiseDivergence(rows, THREE)

    expect(pairs.map((pair) => `${pair.a}${pair.b}`)).toEqual(['ab', 'ac', 'bc'])
    expect(pairs.find((pair) => pair.a === 'a' && pair.b === 'b').percent).toBe(0)
    expect(pairs.find((pair) => pair.a === 'a' && pair.b === 'c').percent).toBe(100)
  })

  it('counts only rows where both projects give one status on the scale', () => {
    const rows = [
      rowOf('term:x', { a: 'Adopt', b: 'Adopt' }),
      rowOf('term:y', { a: 'Adopt' }), // b says nothing
      rowOf('term:z', { a: ['Adopt', 'Hold'], b: 'Adopt' }), // a contradicts itself
      rowOf('term:w', { a: 'Evaluate', b: 'Adopt' }) // not on the scale
    ]

    expect(computePairwiseDivergence(rows, ['a', 'b'])[0]).toMatchObject({ percent: 0, comparedRows: 1 })
  })

  it('measures a settled pair by what was accepted, and still counts the row', () => {
    const rows = [rowOf('term:x', { a: 'Adopt', b: 'Retire' })]

    const settled = computePairwiseDivergence(rows, ['a', 'b'], {
      acceptances: { 'term:x': { b: { mode: 'status', acceptedFrom: 'a' } } }
    })

    // Dropping the rows a pair agrees on would remove the zeros and drive the
    // figure up the more they agree.
    expect(settled[0]).toMatchObject({ percent: 0, comparedRows: 1 })
  })

  it('reports a pair with nothing in common as 0 rows rather than 0 % agreement', () => {
    const rows = [rowOf('term:x', { a: 'Adopt' }), rowOf('term:y', { b: 'Retire' })]

    expect(computePairwiseDivergence(rows, ['a', 'b'])[0]).toMatchObject({ percent: 0, comparedRows: 0 })
  })

  it('has nothing to say about fewer than two projects', () => {
    expect(computePairwiseDivergence([rowOf('term:x', { a: 'Adopt' })], ['a'])).toEqual([])
    expect(computePairwiseDivergence([], [])).toEqual([])
  })

  it('travels with the rest of the comparison', () => {
    const comparison = buildComparison(makeWorkspace(), ALL)

    // Clean Arch is Adopt in Alpha and Trial in Beta: 1 / 4 = 25 %.
    expect(comparison.pairwiseDivergence).toEqual([
      expect.objectContaining({ a: 'p-alpha', b: 'p-beta', percent: 25, comparedRows: 1 })
    ])
  })
})

// F7 — measuring every project against one held-still target instead of
// against each other. The two questions have different answers as soon as the
// target is not what the majority does.
describe('reference baselines', () => {
  const THREE = ['a', 'b', 'c']

  function rowOf(key, byProject) {
    const cells = new Map()
    for (const [projectId, status] of Object.entries(byProject)) {
      cells.set(projectId, {
        projectId,
        values: [].concat(status).map((entry) => ({ status: entry, origin: { rawName: key } }))
      })
    }
    return { key, name: key, term: { id: key }, resolved: true, kind: 'tool', cells }
  }

  describe('buildBaselineFromProject', () => {
    it('copies one project’s column, canonicalized', () => {
      const rows = [rowOf('term:x', { a: 'adopt', b: 'Retire' }), rowOf('term:y', { a: 'Hold' })]

      expect(buildBaselineFromProject(rows, 'a')).toEqual({
        entries: { 'term:x': { name: 'term:x', status: 'Adopt' }, 'term:y': { name: 'term:y', status: 'Hold' } },
        skipped: []
      })
    })

    it('leaves out a cell that contradicts itself, and says so', () => {
      const rows = [rowOf('term:x', { a: ['Adopt', 'Retire'] })]

      const { entries, skipped } = buildBaselineFromProject(rows, 'a')
      expect(entries).toEqual({})
      expect(skipped).toEqual([{ key: 'term:x', name: 'term:x', reason: DELTA.INCONSISTENT }])
    })

    it('leaves out a status the scale does not know — there is no distance to it', () => {
      const rows = [rowOf('term:x', { a: 'Evaluate' }), rowOf('term:y', { a: '' })]

      const { entries, skipped } = buildBaselineFromProject(rows, 'a')
      expect(entries).toEqual({})
      expect(skipped.map((entry) => entry.reason)).toEqual([DELTA.UNSET, DELTA.UNSET])
    })

    it('skips rows the project says nothing about, without reporting them', () => {
      const rows = [rowOf('term:x', { b: 'Adopt' })]

      expect(buildBaselineFromProject(rows, 'a')).toEqual({ entries: {}, skipped: [] })
    })
  })

  describe('buildBaselineFromConsensus', () => {
    it('takes the most common status', () => {
      const rows = [rowOf('term:x', { a: 'Adopt', b: 'Adopt', c: 'Retire' })]

      expect(buildBaselineFromConsensus(rows, THREE).entries).toEqual({
        'term:x': { name: 'term:x', status: 'Adopt' }
      })
    })

    it('skips a tie rather than breaking it', () => {
      const rows = [rowOf('term:x', { a: 'Adopt', b: 'Retire' })]

      const { entries, skipped } = buildBaselineFromConsensus(rows, THREE)
      expect(entries).toEqual({})
      expect(skipped).toEqual([{ key: 'term:x', name: 'term:x', reason: 'tie' }])
    })

    it('ignores cells that contradict themselves or carry no usable status', () => {
      const rows = [rowOf('term:x', { a: ['Adopt', 'Retire'], b: 'Hold', c: '' })]

      expect(buildBaselineFromConsensus(rows, THREE).entries).toEqual({
        'term:x': { name: 'term:x', status: 'Hold' }
      })
    })
  })

  describe('baselineStatusOf', () => {
    it('reads the target of a row, and nothing where there is none', () => {
      const baseline = { entries: { 'term:x': { name: 'X', status: 'Adopt' } } }

      expect(baselineStatusOf(baseline, 'term:x')).toBe('Adopt')
      expect(baselineStatusOf(baseline, 'term:z')).toBe('')
      expect(baselineStatusOf(null, 'term:x')).toBe('')
    })
  })

  describe('deltaOf against a baseline', () => {
    const baseline = { entries: { 'term:x': { name: 'X', status: 'Adopt' } } }

    it('measures every project against the target, worst one deciding', () => {
      const row = rowOf('term:x', { a: 'Adopt', b: 'Trial' })

      expect(deltaOf(row, THREE, { baseline })).toMatchObject({ delta: DELTA.MINOR, distance: 1 })
    })

    it('can disagree with the peer reading — everyone agreeing is not everyone right', () => {
      const row = rowOf('term:x', { a: 'Retire', b: 'Retire' })

      expect(deltaOf(row, THREE).delta).toBe(DELTA.MATCH)
      expect(deltaOf(row, THREE, { baseline })).toMatchObject({ delta: DELTA.CRITICAL, distance: 4 })
    })

    it('reports a term the reference does not list as exactly that', () => {
      const row = rowOf('term:z', { a: 'Adopt', b: 'Retire' })

      expect(deltaOf(row, THREE, { baseline })).toMatchObject({ delta: DELTA.UNLISTED, distance: null })
    })

    it('reports a target no project uses as a gap, not as agreement', () => {
      const row = rowOf('term:x', {})

      expect(deltaOf(row, THREE, { baseline })).toMatchObject({ delta: DELTA.MISSING, distance: null })
    })

    it('keeps the data findings and the explicit override ahead of the measurement', () => {
      expect(deltaOf(rowOf('term:x', { a: ['Adopt', 'Trial'] }), THREE, { baseline }).delta).toBe(DELTA.INCONSISTENT)
      expect(deltaOf(rowOf('term:x', { a: '' }), THREE, { baseline }).delta).toBe(DELTA.UNSET)
      expect(deltaOf(rowOf('term:x', { a: 'Retire' }), THREE, { baseline, override: { level: 'accepted' } }).delta).toBe(
        DELTA.ACCEPTED
      )
      expect(deltaOf(rowOf('term:x', { a: 'Adopt' }), THREE, { baseline, override: { level: 'critical' } }).delta).toBe(
        DELTA.CRITICAL
      )
    })

    it('reports a status the scale does not know as unset, not as a small distance', () => {
      // |rank(-1) - target| is an arithmetic result, not a distance. Reading it
      // as one turns "we cannot say" into "▲ minor".
      const row = rowOf('term:x', { a: 'Evaluate' })

      expect(deltaOf(row, THREE, { baseline })).toMatchObject({ delta: DELTA.UNSET, distance: null })
      expect(deltaOf(row, THREE, { baseline }).reasons).toContain(DELTA.UNSET)
    })

    it('reports it as unset wherever the unknown status sits on the row', () => {
      const row = rowOf('term:x', { a: 'Adopt', b: 'Evaluate' })

      expect(deltaOf(row, THREE, { baseline }).delta).toBe(DELTA.UNSET)
    })

    it('measures a project by what it silently accepted', () => {
      const row = rowOf('term:x', { a: 'Adopt', b: 'Retire' })

      expect(
        deltaOf(row, THREE, { baseline, acceptances: { b: { mode: 'status', acceptedFrom: 'a' } } })
      ).toMatchObject({ delta: DELTA.SILENT, distance: 0 })
    })

    it('measures a single project against the target, where peer mode had nothing to say', () => {
      const row = rowOf('term:x', { a: 'Retire' })

      expect(deltaOf(row, THREE).delta).toBe(DELTA.NONE)
      expect(deltaOf(row, THREE, { baseline }).delta).toBe(DELTA.CRITICAL)
    })
  })

  describe('computeBaselineAgreement', () => {
    const baseline = {
      entries: {
        'term:x': { name: 'X', status: 'Adopt' },
        'term:y': { name: 'Y', status: 'Trial' },
        'term:z': { name: 'Z', status: 'Hold' }
      }
    }

    it('reports each project on its own, with the number of rows behind it', () => {
      const rows = [
        rowOf('term:x', { a: 'Adopt', b: 'Retire' }),
        rowOf('term:y', { a: 'Trial', b: 'Trial' }),
        rowOf('term:z', { a: 'Assess' })
      ]

      const agreement = computeBaselineAgreement(rows, ['a', 'b'], baseline)

      expect(agreement.a).toMatchObject({ percent: 67, comparedRows: 3 })
      expect(agreement.a.byClass).toEqual({ match: 2, minor: 1, significant: 0, critical: 0 })
      // b never rated Z, so it is not counted against it.
      expect(agreement.b).toMatchObject({ percent: 50, comparedRows: 2 })
    })

    it('leaves out rows the reference does not list', () => {
      const rows = [rowOf('term:x', { a: 'Adopt' }), rowOf('term:other', { a: 'Retire' })]

      expect(computeBaselineAgreement(rows, ['a'], baseline).a).toMatchObject({ percent: 100, comparedRows: 1 })
    })

    it('leaves out a cell that contradicts itself or carries no usable status', () => {
      const rows = [rowOf('term:x', { a: ['Adopt', 'Trial'] }), rowOf('term:y', { a: '' })]

      expect(computeBaselineAgreement(rows, ['a'], baseline).a).toMatchObject({ percent: 0, comparedRows: 0 })
    })

    it('credits a project for what it silently accepted', () => {
      const rows = [rowOf('term:x', { a: 'Adopt', b: 'Retire' })]

      const agreement = computeBaselineAgreement(rows, ['a', 'b'], baseline, {
        acceptances: { 'term:x': { b: { mode: 'status', acceptedFrom: 'a' } } }
      })

      expect(agreement.b).toMatchObject({ percent: 100, comparedRows: 1 })
    })
  })

  describe('buildComparison against a baseline', () => {
    it('adds a row for a target no project uses, and counts it as a gap', () => {
      const workspace = makeWorkspace()
      const baseline = { entries: { 'raw:kafka': { name: 'Kafka', status: 'Adopt' } } }

      const comparison = buildComparison(workspace, ALL, { baseline })

      const kafka = comparison.rows.find((row) => row.name === 'Kafka')
      expect(kafka).toMatchObject({ delta: DELTA.MISSING, baselineStatus: 'Adopt' })
      expect(comparison.metrics.missing).toBe(1)
      expect(comparison.metrics.compared).toBe(0)
    })

    it('reports the terms outside the reference without counting them as agreement', () => {
      const workspace = makeWorkspace()
      const baseline = { entries: { 'raw:clean arch': { name: 'Clean Arch', status: 'Adopt' } } }

      const comparison = buildComparison(workspace, ALL, { baseline })

      expect(comparison.metrics.unlisted).toBe(1)
      expect(comparison.metrics.compared).toBe(1)
      expect(comparison.metrics.matches + comparison.metrics.minor).toBe(1)
      expect(comparison.baselineAgreement['p-alpha'].comparedRows).toBe(1)
    })

    it('does not count a target nobody uses as a term unique to somebody', () => {
      const workspace = makeWorkspace()
      const baseline = { entries: { 'raw:kafka': { name: 'Kafka', status: 'Adopt' } } }

      const { metrics } = buildComparison(workspace, ALL, { baseline })

      // ◑ unique means "exactly one project uses it". No project uses this one,
      // so counting it there would make `unique` exceed its own breakdown.
      expect(metrics.missing).toBe(1)
      const attributed = Object.values(metrics.uniqueByProject).reduce((sum, count) => sum + count, 0)
      expect(attributed).toBe(metrics.unique)
    })

    it('does not call a target nobody uses a possible false difference', () => {
      const workspace = makeWorkspace()
      const baseline = { entries: { 'raw:kafka': { name: 'Kafka', status: 'Adopt' } } }

      const kafka = buildComparison(workspace, ALL, { baseline }).rows.find((row) => row.name === 'Kafka')

      // ⁉ means "this difference may not be real". A row no project produced is
      // not a difference at all — it is the gap the reference is there to show.
      expect(kafka.possibleFalseDifference).toBe(false)
    })

    it('keeps the metric invariants against a reference too', () => {
      const workspace = makeWorkspace()
      const baseline = {
        entries: {
          'raw:clean arch': { name: 'Clean Arch', status: 'Adopt' },
          'raw:kafka': { name: 'Kafka', status: 'Trial' }
        }
      }

      const { metrics } = buildComparison(workspace, ALL, { baseline })

      // The same three invariants DE-8 states for peer mode: the classes add up
      // to comparable, the exclusions add up exactly, and nothing uncompared is
      // subtracted from a total it was never in.
      expect(metrics.matches + metrics.minor + metrics.significant + metrics.critical).toBe(metrics.comparable)
      expect(metrics.unset + metrics.inconsistent + metrics.accepted).toBe(metrics.excluded)
      expect(metrics.compared - metrics.excluded).toBe(metrics.comparable)
      expect(metrics.compared + metrics.unlisted + metrics.missing).toBeLessThanOrEqual(metrics.total)
      expect(metrics.silent).toBeLessThanOrEqual(metrics.matches)
    })

    it('leaves baselineAgreement empty in peer mode rather than inventing one', () => {
      const comparison = buildComparison(makeWorkspace(), ALL)

      expect(comparison.baseline).toBeNull()
      expect(comparison.baselineAgreement).toEqual({})
      expect(comparison.metrics).toMatchObject({ unlisted: 0, missing: 0 })
    })
  })
})

// F6 — the matrix is sorted by clicking a header, so the comparator has to
// cover a column per project as well as the fixed ones.
describe('sortRows / compareRows', () => {
  const TWO = ['p-a', 'p-b']

  function row(name, { coverage = COVERAGE.ALL, delta = DELTA.MATCH, statuses = {} } = {}) {
    const cells = new Map()
    for (const [projectId, list] of Object.entries(statuses)) {
      cells.set(projectId, {
        projectId,
        values: [].concat(list).map((status) => ({ status, origin: { rawName: name } }))
      })
    }
    return { key: `term:${name}`, name, coverage, delta, cells }
  }

  it('sorts by term name, and turns it around on demand', () => {
    const rows = [row('Vue'), row('Angular'), row('React')]

    expect(sortRows(rows, { column: SORT_COLUMN.TERM }).map((entry) => entry.name)).toEqual([
      'Angular',
      'React',
      'Vue'
    ])
    expect(
      sortRows(rows, { column: SORT_COLUMN.TERM, direction: 'desc' }).map((entry) => entry.name)
    ).toEqual(['Vue', 'React', 'Angular'])
  })

  it('does not mutate the rows it was given', () => {
    const rows = [row('Vue'), row('Angular')]
    const order = rows.map((entry) => entry.name)

    sortRows(rows, { column: SORT_COLUMN.TERM })

    expect(rows.map((entry) => entry.name)).toEqual(order)
  })

  it('puts the widest coverage first on the first click', () => {
    const rows = [
      row('Unique', { coverage: COVERAGE.UNIQUE }),
      row('All', { coverage: COVERAGE.ALL }),
      row('Partial', { coverage: COVERAGE.PARTIAL })
    ]

    expect(sortRows(rows, { column: SORT_COLUMN.COVERAGE }).map((entry) => entry.coverage)).toEqual([
      COVERAGE.ALL,
      COVERAGE.PARTIAL,
      COVERAGE.UNIQUE
    ])
  })

  it('puts the worst divergence first on the first click', () => {
    const rows = DELTA_SORT_ORDER.map((delta) => row(delta, { delta }))

    expect(sortRows([...rows].reverse(), { column: SORT_COLUMN.DELTA }).map((entry) => entry.delta)).toEqual(
      DELTA_SORT_ORDER
    )
  })

  it('sorts a project column by that project’s status, best first', () => {
    const rows = [
      row('Retired', { statuses: { 'p-a': 'Retire' } }),
      row('Adopted', { statuses: { 'p-a': 'adopt' } }),
      row('Trialled', { statuses: { 'p-a': 'Trial' } })
    ]

    expect(
      sortRows(rows, { column: projectSortColumn('p-a') }).map((entry) => entry.name)
    ).toEqual(['Adopted', 'Trialled', 'Retired'])
  })

  it('ranks a cell with several takes by its worst one', () => {
    const rows = [
      row('Mixed', { statuses: { 'p-a': ['Adopt', 'Hold'] } }),
      row('Trialled', { statuses: { 'p-a': 'Trial' } })
    ]

    // Mixed holds Adopt (0) and Hold (3); the worse one decides, so it sorts
    // behind a plain Trial (1).
    expect(sortRows(rows, { column: projectSortColumn('p-a') }).map((entry) => entry.name)).toEqual([
      'Trialled',
      'Mixed'
    ])
  })

  it('keeps cells without a value last in both directions', () => {
    const rows = [
      row('Missing', { statuses: {} }),
      row('Adopted', { statuses: { 'p-a': 'Adopt' } }),
      row('Retired', { statuses: { 'p-a': 'Retire' } })
    ]

    expect(sortRows(rows, { column: projectSortColumn('p-a') }).map((entry) => entry.name)).toEqual([
      'Adopted',
      'Retired',
      'Missing'
    ])
    expect(
      sortRows(rows, { column: projectSortColumn('p-a'), direction: 'desc' }).map((entry) => entry.name)
    ).toEqual(['Retired', 'Adopted', 'Missing'])
  })

  it('sorts a value off the scale between the ranked ones and the empty ones', () => {
    const rows = [
      row('Missing', { statuses: {} }),
      row('Unknown', { statuses: { 'p-a': 'Evaluate' } }),
      row('Adopted', { statuses: { 'p-a': 'Adopt' } })
    ]

    expect(sortRows(rows, { column: projectSortColumn('p-a') }).map((entry) => entry.name)).toEqual([
      'Adopted',
      'Unknown',
      'Missing'
    ])
  })

  it('breaks every tie by name, so the same rows sort the same way twice', () => {
    const rows = [row('Vue', { coverage: COVERAGE.ALL }), row('Angular', { coverage: COVERAGE.ALL })]

    expect(sortRows(rows, { column: SORT_COLUMN.COVERAGE }).map((entry) => entry.name)).toEqual([
      'Angular',
      'Vue'
    ])
    expect(
      sortRows(rows, { column: SORT_COLUMN.COVERAGE, direction: 'desc' }).map((entry) => entry.name)
    ).toEqual(['Angular', 'Vue'])
  })

  it('reads a project id back out of a column id, and only out of one', () => {
    expect(projectIdOfSortColumn(projectSortColumn('p-a'))).toBe('p-a')
    expect(projectIdOfSortColumn(SORT_COLUMN.COVERAGE)).toBe('')
    expect(projectIdOfSortColumn(undefined)).toBe('')
  })

  it('falls back to the term order for an unknown column, and survives empty input', () => {
    const rows = [row('Vue'), row('Angular')]

    expect(sortRows(rows, { column: 'nonsense' }).map((entry) => entry.name)).toEqual(['Angular', 'Vue'])
    expect(sortRows(undefined)).toEqual([])
    expect(compareRows(undefined, undefined)).toBe(0)
    expect(TWO).toHaveLength(2)
  })
})

// design §5.4 — the four special cases look deliberately different rather than
// all being dimmed, and conflict lines only appear from distance 2.
describe('radar overlay', () => {
  const TWO = ['a', 'b']
  const reference = { id: 'a', radarCategoryQuadrants: { Architecture: 0, Stack: 1 } }

  function overlayRow(name, byProject, { resolved = true, kind = 'tool', category = 'Architecture' } = {}) {
    const cells = new Map()
    for (const [projectId, statuses] of Object.entries(byProject)) {
      cells.set(projectId, {
        projectId,
        values: (Array.isArray(statuses) ? statuses : [statuses]).map((status) => ({
          status,
          origin: { categoryTitle: category, entryTitle: 'Entry', rawName: name }
        }))
      })
    }
    return {
      key: resolved ? `term:${name}` : `raw:${name}`,
      name,
      resolved,
      kind,
      term: resolved ? { id: name } : null,
      cells
    }
  }

  describe('quadrantMapOf', () => {
    it('uses the reference project’s explicit assignment', () => {
      expect(quadrantMapOf(reference).get('Stack')).toBe(1)
    })

    it('falls back to the category order when nothing is assigned', () => {
      const map = quadrantMapOf({ radarCategoryOrder: ['A', 'B', 'C', 'D', 'E'] })

      expect(map.get('A')).toBe(0)
      expect(map.get('D')).toBe(3)
      // Everything past the fourth shares the leftover quadrant.
      expect(map.get('E')).toBe(OTHER_QUADRANT)
    })

    it('is empty for a project without any layout', () => {
      expect(quadrantMapOf({}).size).toBe(0)
      expect(quadrantMapOf(null).size).toBe(0)
    })
  })

  it('places a point per project take, on the ring of its status', () => {
    const { points } = buildRadarOverlay([overlayRow('Vue', { a: 'Adopt', b: 'Hold' })], TWO, reference)

    expect(points.map((point) => [point.projectId, point.ring, point.quadrant])).toEqual([
      ['a', 0, 0],
      ['b', 3, 0]
    ])
  })

  it('sends a category the reference project does not know to the leftover quadrant', () => {
    const row = overlayRow('Vue', { a: 'Adopt' }, { category: 'Messaging' })
    const { points } = buildRadarOverlay([row], TWO, reference)

    expect(points[0].quadrant).toBe(OTHER_QUADRANT)
  })

  it('⊘ does not plot a blip without a status — it is listed instead', () => {
    const { points, withoutStatus } = buildRadarOverlay([overlayRow('Vue', { a: '', b: 'Hold' })], TWO, reference)

    expect(points.map((point) => point.projectId)).toEqual(['b'])
    expect(withoutStatus.map((entry) => entry.name)).toEqual(['Vue'])
  })

  it('⚠ plots every position of an internally uneven project and joins its own points', () => {
    const { points, conflicts } = buildRadarOverlay(
      [overlayRow('Vue', { a: ['Adopt', 'Retire'], b: 'Adopt' })],
      TWO,
      reference
    )

    expect(points.filter((point) => point.projectId === 'a')).toHaveLength(2)
    const internal = conflicts.filter((conflict) => conflict.kind === 'internal')
    expect(internal).toHaveLength(1)
    expect(internal[0].projectId).toBe('a')
    // No cross-project line for such a row — there is no single position to draw from.
    expect(conflicts.some((conflict) => conflict.kind === 'cross-project')).toBe(false)
  })

  it('◌ marks an unresolved name and draws no conflict line for it', () => {
    const row = overlayRow('vue', { a: 'Adopt', b: 'Retire' }, { resolved: false })
    const { points, conflicts } = buildRadarOverlay([row], TWO, reference)

    expect(points.every((point) => point.unresolved)).toBe(true)
    // The identity is unclear, so a conflict line would assert too much.
    expect(conflicts).toEqual([])
  })

  it('⬚ marks a point whose kind is unknown', () => {
    const row = overlayRow('Vue', { a: 'Adopt' }, { kind: 'unassigned' })

    expect(buildRadarOverlay([row], TWO, reference).points[0].unassignedKind).toBe(true)
  })

  it('draws a conflict line from distance 2 upwards, not below', () => {
    const near = buildRadarOverlay([overlayRow('Vue', { a: 'Adopt', b: 'Trial' })], TWO, reference)
    const far = buildRadarOverlay([overlayRow('Vue', { a: 'Adopt', b: 'Assess' })], TWO, reference)

    expect(near.conflicts).toEqual([])
    expect(far.conflicts).toHaveLength(1)
    expect(far.conflicts[0]).toMatchObject({ kind: 'cross-project', distance: 2 })
  })

  it('draws no conflict line for a term only one project uses', () => {
    expect(buildRadarOverlay([overlayRow('Vue', { a: 'Adopt' })], TWO, reference).conflicts).toEqual([])
  })

  it('connects the two extremes when three projects disagree', () => {
    const three = ['a', 'b', 'c']
    const { conflicts } = buildRadarOverlay(
      [overlayRow('Vue', { a: 'Adopt', b: 'Assess', c: 'Retire' })],
      three,
      reference
    )

    expect(conflicts[0].points.map((point) => point.ring)).toEqual([0, 4])
    expect(conflicts[0].distance).toBe(4)
  })

  describe('quadrantLabelsOf', () => {
    it('names each corner after the categories the reference files there', () => {
      expect(quadrantLabelsOf(reference)).toEqual(['Architecture', 'Stack', '', 'Other'])
    })

    it('prefers the project’s own quadrant label over the derived one', () => {
      const labelled = { ...reference, radarQuadrantLabels: { 0: 'Runtime' } }

      expect(quadrantLabelsOf(labelled)[0]).toBe('Runtime')
    })

    it('counts the extra categories of a corner that holds several', () => {
      const crowded = { radarCategoryQuadrants: { Architecture: 0, Stack: 0, Ops: 0 } }

      expect(quadrantLabelsOf(crowded)[0]).toBe('Architecture (+2)')
    })

    it('announces the leftover quadrant as the catch-all it is', () => {
      expect(quadrantLabelsOf({ radarCategoryQuadrants: { Data: 3 } })[OTHER_QUADRANT]).toBe('Data · Other')
      expect(quadrantLabelsOf(null)).toEqual(['', '', '', 'Other'])
    })
  })

  describe('layoutRadarOverlay', () => {
    const geometry = { size: 400, radius: 160 }

    function layoutOf(rows, projectIds = TWO) {
      return layoutRadarOverlay(buildRadarOverlay(rows, projectIds, reference), geometry)
    }

    it('places every point inside the chart, on the radius of its ring', () => {
      const { points, center } = layoutOf([overlayRow('Vue', { a: 'Adopt', b: 'Retire' })])

      expect(points).toHaveLength(2)
      const distances = points.map((point) => Math.hypot(point.x - center, point.y - center))
      expect(Math.min(...distances)).toBeLessThan(Math.max(...distances))
      points.forEach((point) => {
        expect(Math.hypot(point.x - center, point.y - center)).toBeLessThanOrEqual(geometry.radius)
      })
    })

    it('places a point by its data, not by the order the rows arrive in', () => {
      const vue = overlayRow('Vue', { a: 'Adopt', b: 'Adopt' })
      const react = overlayRow('React', { a: 'Adopt', b: 'Adopt' })
      const positionOfVue = (rows) =>
        layoutOf(rows)
          .points.filter((point) => point.name === 'Vue')
          .map((point) => [Math.round(point.x), Math.round(point.y)])

      expect(positionOfVue([vue, react])).toEqual(positionOfVue([react, vue]))
    })

    it('draws its segments between the points it placed', () => {
      const { points, segments } = layoutOf([overlayRow('Vue', { a: 'Adopt', b: 'Retire' })])
      const placed = points.map((point) => `${point.x},${point.y}`)

      expect(segments).toHaveLength(1)
      expect(placed).toContain(`${segments[0].x1},${segments[0].y1}`)
      expect(placed).toContain(`${segments[0].x2},${segments[0].y2}`)
    })

    it('labels the five rings from the inside out and the four corners', () => {
      const { rings, quadrantCorners } = layoutOf([])

      expect(rings.map((ring) => ring.label)).toEqual(STATUS_LABELS)
      expect(rings.map((ring) => ring.outer)).toEqual([32, 64, 96, 128, 160])
      expect(quadrantCorners).toHaveLength(4)
    })

    it('puts a top-left category into the top-left quadrant', () => {
      const { points, center } = layoutOf([overlayRow('Vue', { a: 'Hold' }, { category: 'Stack' })])

      expect(points[0].x).toBeLessThan(center)
      expect(points[0].y).toBeLessThan(center)
    })

    it('survives an empty overlay', () => {
      const empty = layoutRadarOverlay({ points: [], conflicts: [], withoutStatus: [] }, geometry)

      expect(empty.points).toEqual([])
      expect(empty.segments).toEqual([])
    })
  })
})
