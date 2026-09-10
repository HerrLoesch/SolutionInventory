import { describe, it, expect } from 'vitest'
import { buildAliasIndex } from '../../src/services/vocabulary'
import { buildComparison, COVERAGE, DELTA } from '../../src/services/comparison'

// The edge-case list from plan §3.3, checked as one block. These are the cases
// that shaped the design and, in the plan's words, the ones that break — so they
// are pinned in one place rather than scattered across the suite.

function workspaceWith(projects, questionnaires = [], vocabulary = []) {
  return { id: 'ws', vocabulary, comparisonOverrides: {}, dismissedSuggestions: [], projects, questionnaires }
}

function project(id, radar, questionnaireIds = []) {
  return { id, name: id, questionnaireIds, radar }
}

function compare(workspace, projectIds, options = {}) {
  const { index } = buildAliasIndex(workspace.vocabulary)
  return buildComparison(workspace, projectIds, { aliasIndex: index, ...options })
}

describe('edge cases from plan §3.3', () => {
  it('an empty workspace produces nothing and no division by zero', () => {
    const { rows, metrics } = compare(workspaceWith([]), [])

    expect(rows).toEqual([])
    expect(metrics).toMatchObject({ total: 0, comparable: 0, agreementPercent: 0, allPercent: 0 })
  })

  it('a workspace with one project yields only unique rows', () => {
    const workspace = workspaceWith([project('a', [{ entryId: 'e1', option: 'Vue', status: 'Adopt' }])])
    const { rows, metrics } = compare(workspace, ['a'])

    expect(rows[0].coverage).toBe(COVERAGE.UNIQUE)
    expect(rows[0].delta).toBe(DELTA.NONE)
    expect(metrics.compared).toBe(0)
  })

  it('a project without radar blips is an empty column, not an error', () => {
    const workspace = workspaceWith([
      project('a', [{ entryId: 'e1', option: 'Vue', status: 'Adopt' }]),
      project('b', [])
    ])
    const { rows } = compare(workspace, ['a', 'b'])

    expect(rows).toHaveLength(1)
    expect(rows[0].cells.has('b')).toBe(false)
  })

  // DE-7: an empty entry.status whose answer carries one is an *assessed* blip.
  it('a blip with an empty entry status inherits the answer status — not ⊘ unset', () => {
    const workspace = workspaceWith(
      [
        project('a', [{ entryId: 'e1', option: 'Vue', status: '' }], ['q-a']),
        project('b', [{ entryId: 'e1', option: 'Vue', status: 'Trial' }], ['q-b'])
      ],
      [
        {
          id: 'q-a',
          name: 'A',
          categories: [
            {
              id: 'c',
              title: 'UI',
              entries: [{ id: 'e1', aspect: 'UI', answers: [{ technology: 'Vue', status: 'Trial' }] }]
            }
          ]
        },
        {
          id: 'q-b',
          name: 'B',
          categories: [
            {
              id: 'c',
              title: 'UI',
              entries: [{ id: 'e1', aspect: 'UI', answers: [{ technology: 'Vue', status: 'Trial' }] }]
            }
          ]
        }
      ]
    )
    const { rows } = compare(workspace, ['a', 'b'])

    expect(rows[0].delta).toBe(DELTA.MATCH)
    expect(rows[0].reasons).toEqual([])
  })

  it('a blip whose both status sources are empty is ⊘ unset', () => {
    const workspace = workspaceWith([
      project('a', [{ entryId: 'e1', option: 'Vue', status: '' }]),
      project('b', [{ entryId: 'e1', option: 'Vue', status: 'Adopt' }])
    ])
    const { rows } = compare(workspace, ['a', 'b'])

    expect(rows[0].delta).toBe(DELTA.UNSET)
    expect(rows[0].distance).toBeNull()
  })

  // DE-3
  it('the same term twice in one project under different entries is ⚠ inconsistent', () => {
    const workspace = workspaceWith([
      project('a', [
        { entryId: 'orm', option: 'EF Core', status: 'Adopt' },
        { entryId: 'data', option: 'EF Core', status: 'Hold' }
      ]),
      project('b', [{ entryId: 'orm', option: 'EF Core', status: 'Trial' }])
    ])
    const { rows } = compare(workspace, ['a', 'b'])

    expect(rows[0].delta).toBe(DELTA.INCONSISTENT)
    expect(rows[0].cells.get('a').values).toHaveLength(2)
  })

  // Several Δ conditions at once → exactly one badge, by the §5.3 precedence.
  it('a term that is ⚠ in one project and ⊘ in another carries exactly one badge', () => {
    const workspace = workspaceWith([
      project('a', [
        { entryId: 'e1', option: 'Vue', status: 'Adopt' },
        { entryId: 'e2', option: 'Vue', status: 'Hold' }
      ]),
      project('b', [{ entryId: 'e1', option: 'Vue', status: '' }])
    ])
    const { rows, metrics } = compare(workspace, ['a', 'b'])

    expect(rows[0].delta).toBe(DELTA.INCONSISTENT)
    expect(rows[0].reasons).toEqual([DELTA.INCONSISTENT, DELTA.UNSET])
    // Counted once, in one reason only.
    expect(metrics.inconsistent).toBe(1)
    expect(metrics.unset).toBe(0)
    expect(metrics.excluded).toBe(1)
  })

  // DE-8
  it('a ◑ unique term that is internally uneven does not count in Excluded', () => {
    const workspace = workspaceWith([
      project('a', [
        { entryId: 'e1', option: 'Vue', status: 'Adopt' },
        { entryId: 'e2', option: 'Vue', status: 'Hold' }
      ]),
      project('b', [{ entryId: 'e3', option: 'Scrum', status: 'Adopt' }])
    ])
    const { metrics } = compare(workspace, ['a', 'b'])

    expect(metrics.unique).toBe(2)
    expect(metrics.compared).toBe(0)
    expect(metrics.excluded).toBe(0)
    expect(metrics.inconsistent).toBe(0)
  })

  it('a name with neither a term nor an answerType is ⬚ unassigned', () => {
    const workspace = workspaceWith([project('a', [{ entryId: 'e1', option: 'Kafka', status: 'Adopt' }])])
    const { rows } = compare(workspace, ['a'])

    expect(rows[0].kind).toBe('unassigned')
    expect(rows[0].resolved).toBe(false)
  })

  it('an alias that already belongs to another term is a reported collision, not a silent overwrite', () => {
    const vocabulary = [
      { id: 'term-a', name: 'A', kind: 'tool', aliases: ['shared'] },
      { id: 'term-b', name: 'B', kind: 'tool', aliases: ['shared'] }
    ]

    expect(buildAliasIndex(vocabulary).collisions).toEqual([
      { key: 'shared', termId: 'term-a', conflictingTermId: 'term-b' }
    ])
  })

  it('a blip whose entry or answer was deleted still yields a defined row', () => {
    const workspace = workspaceWith(
      [project('a', [{ entryId: 'gone', option: 'Vue', status: 'Adopt' }], ['q-a'])],
      [{ id: 'q-a', name: 'A', categories: [] }]
    )
    const { rows } = compare(workspace, ['a'])

    expect(rows).toHaveLength(1)
    expect(rows[0].cells.get('a').values[0].origin.entryTitle).toBe('')
    expect(rows[0].kind).toBe('unassigned')
  })

  it('projects with different catalogs still meet on the term', () => {
    const workspace = workspaceWith(
      [
        project('a', [{ entryId: 'arch', option: 'Clean Arch', status: 'Adopt' }], ['q-a']),
        project('b', [{ entryId: 'pattern', option: 'clean arch', status: 'Adopt' }], ['q-b'])
      ],
      [
        {
          id: 'q-a',
          name: 'A',
          categories: [{ id: 'c1', title: 'Architecture', entries: [{ id: 'arch', aspect: 'Pattern', answers: [] }] }]
        },
        {
          id: 'q-b',
          name: 'B',
          categories: [{ id: 'c2', title: 'Design', entries: [{ id: 'pattern', aspect: 'Structure', answers: [] }] }]
        }
      ]
    )
    const { rows } = compare(workspace, ['a', 'b'])

    // Different entry ids, different categories, different catalogs — one row.
    expect(rows).toHaveLength(1)
    expect(rows[0].coverage).toBe(COVERAGE.ALL)
    expect(rows[0].delta).toBe(DELTA.MATCH)
  })
})
