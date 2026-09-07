import { describe, it, expect } from 'vitest'
import {
  collectUnits,
  comparisonKeyOf,
  buildRows,
  isCellInconsistent,
  coverageOf,
  COVERAGE,
  deltaOf,
  DELTA,
  statusRank,
  maxDistance,
  classifyDistance,
  STATUS_SCALE,
  DATA_SOURCES
} from '../../src/services/comparison'
import { buildAliasIndex } from '../../src/services/vocabulary'

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
