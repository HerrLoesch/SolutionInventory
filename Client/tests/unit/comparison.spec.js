import { describe, it, expect } from 'vitest'
import { collectUnits, comparisonKeyOf, DATA_SOURCES } from '../../src/services/comparison'
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
