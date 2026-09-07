import { describe, it, expect } from 'vitest'
import { buildEntryLookup, findMatchingCandidate, deriveBlipJoin, deriveKind } from '../../src/services/blipJoin'

function questionnaire(overrides = {}) {
  return {
    id: 'q1',
    name: 'Q1',
    categories: [
      {
        id: 'cat-1',
        title: 'Architecture',
        entries: [
          {
            id: 'e1',
            aspect: 'High-Level Pattern',
            answers: [{ technology: 'Clean Arch', status: 'Adopt', answerType: 'Practice', comments: 'ok' }]
          }
        ]
      }
    ],
    ...overrides
  }
}

describe('buildEntryLookup', () => {
  it('indexes entries by id with their category and aspect title', () => {
    const lookup = buildEntryLookup([questionnaire()])

    expect(lookup.get('e1').categoryTitle).toBe('Architecture')
    expect(lookup.get('e1').entryTitle).toBe('High-Level Pattern')
    expect(lookup.get('e1').candidates).toHaveLength(1)
  })

  it('records which questionnaire each answer came from', () => {
    const lookup = buildEntryLookup([questionnaire()])

    expect(lookup.get('e1').candidates[0]).toMatchObject({
      tech: 'Clean Arch',
      questionnaireId: 'q1',
      questionnaireName: 'Q1'
    })
  })

  it('skips metadata categories — they describe the solution, not its technologies', () => {
    const withMetadata = questionnaire()
    withMetadata.categories.unshift({
      id: 'meta',
      title: 'Solution',
      isMetadata: true,
      entries: [{ id: 'm1', answers: [] }]
    })
    const lookup = buildEntryLookup([withMetadata])

    expect(lookup.has('m1')).toBe(false)
    expect(lookup.has('e1')).toBe(true)
  })

  it('collects answers for the same entry id across two questionnaires (DE-3)', () => {
    const second = questionnaire({ id: 'q2', name: 'Q2' })
    second.categories[0].entries[0].answers = [{ technology: 'Layered', status: 'Hold', answerType: 'Practice' }]
    const lookup = buildEntryLookup([questionnaire(), second])

    expect(lookup.get('e1').candidates.map((candidate) => candidate.tech)).toEqual(['Clean Arch', 'Layered'])
  })

  it('drops answers without a technology name', () => {
    const sparse = questionnaire()
    sparse.categories[0].entries[0].answers = [{ technology: '  ', status: 'Adopt' }, { technology: 'Vue' }]
    const lookup = buildEntryLookup([sparse])

    expect(lookup.get('e1').candidates.map((candidate) => candidate.tech)).toEqual(['Vue'])
  })

  it('returns an empty lookup for missing, empty or malformed input', () => {
    expect(buildEntryLookup(undefined).size).toBe(0)
    expect(buildEntryLookup([]).size).toBe(0)
    expect(buildEntryLookup([{ id: 'q' }]).size).toBe(0)
    expect(buildEntryLookup([{ id: 'q', categories: [{ title: 'X' }] }]).size).toBe(0)
  })
})

describe('findMatchingCandidate', () => {
  const lookup = buildEntryLookup([questionnaire()])

  it('matches on entry id plus a case-insensitive name comparison', () => {
    expect(findMatchingCandidate({ entryId: 'e1', option: 'clean ARCH' }, lookup).tech).toBe('Clean Arch')
  })

  it('returns null when the entry was deleted in the meantime', () => {
    expect(findMatchingCandidate({ entryId: 'gone', option: 'Clean Arch' }, lookup)).toBeNull()
  })

  it('returns null when the answer was deleted in the meantime', () => {
    expect(findMatchingCandidate({ entryId: 'e1', option: 'Layered' }, lookup)).toBeNull()
  })
})

describe('deriveBlipJoin', () => {
  const lookup = buildEntryLookup([questionnaire()])

  it('inherits status and category from the answer when the entry curates neither', () => {
    const joined = deriveBlipJoin({ entryId: 'e1', option: 'Clean Arch', status: '', category: '' }, lookup)

    expect(joined.effectiveStatus).toBe('Adopt')
    expect(joined.effectiveCategory).toBe('Architecture')
    expect(joined.answerType).toBe('Practice')
    expect(joined.overrideStatus).toBe('')
  })

  it('prefers a curated status and category, and marks them as overrides', () => {
    const joined = deriveBlipJoin({ entryId: 'e1', option: 'Clean Arch', status: 'Retire', category: 'Legacy' }, lookup)

    expect(joined.effectiveStatus).toBe('Retire')
    expect(joined.effectiveCategory).toBe('Legacy')
    expect(joined.overrideStatus).toBe('Retire')
    expect(joined.overrideCategoryTitle).toBe('Legacy')
    expect(joined.naturalCategoryTitle).toBe('Architecture')
  })

  it('leaves effectiveStatus empty only when neither side carries one — the ⊘ unset case (DE-7)', () => {
    const unrated = buildEntryLookup([
      (() => {
        const q = questionnaire()
        q.categories[0].entries[0].answers = [{ technology: 'Clean Arch', status: '', answerType: 'Practice' }]
        return q
      })()
    ])
    const joined = deriveBlipJoin({ entryId: 'e1', option: 'Clean Arch', status: '' }, unrated)

    expect(joined.effectiveStatus).toBe('')
  })

  it('stays a defined state when the entry or answer is gone', () => {
    const joined = deriveBlipJoin({ entryId: 'gone', option: 'Whatever', status: '' }, lookup)

    expect(joined.answer).toBeNull()
    expect(joined.answerType).toBe('')
    expect(joined.effectiveStatus).toBe('')
    expect(joined.effectiveCategory).toBe('')
    expect(joined.entryTitle).toBe('')
  })
})

// DE-11: term.kind → answerType → unassigned. The two spellings differ on
// purpose ('Tool' vs 'tool'), so the mapping is asserted in both directions.
describe('deriveKind', () => {
  const vocabulary = [
    { id: 'term-clean-arch', name: 'Clean Arch', kind: 'practice', aliases: [] },
    { id: 'term-redis', name: 'Redis', kind: 'tool', aliases: ['redis cache'] }
  ]

  it('takes the resolved term’s kind first, even when answerType disagrees', () => {
    expect(deriveKind('Clean Arch', 'Tool', vocabulary)).toBe('practice')
    expect(deriveKind('redis cache', 'Practice', vocabulary)).toBe('tool')
  })

  it('falls back to answerType for a name the vocabulary does not know', () => {
    expect(deriveKind('Kafka', 'Tool', vocabulary)).toBe('tool')
    expect(deriveKind('Kafka', 'Practice', vocabulary)).toBe('practice')
    expect(deriveKind('Kafka', '  tool  ', vocabulary)).toBe('tool')
  })

  it('is unassigned when nothing resolves and there is no answerType', () => {
    expect(deriveKind('Kafka', '', vocabulary)).toBe('unassigned')
    expect(deriveKind('Kafka', undefined, vocabulary)).toBe('unassigned')
  })

  it('is unassigned for an answerType that is neither Tool nor Practice', () => {
    expect(deriveKind('Kafka', 'Framework', vocabulary)).toBe('unassigned')
  })

  it('is unassigned when the entry was deleted, so no answerType is left', () => {
    expect(deriveKind('Kafka', '', [])).toBe('unassigned')
  })

  it('ignores a term whose kind is missing or invalid and falls through', () => {
    const broken = [{ id: 'term-x', name: 'X', kind: '', aliases: [] }]

    expect(deriveKind('X', 'Tool', broken)).toBe('tool')
    expect(deriveKind('X', '', broken)).toBe('unassigned')
  })

  it('is unassigned for an empty name', () => {
    expect(deriveKind('', 'Tool', vocabulary)).toBe('tool')
    expect(deriveKind('', '', vocabulary)).toBe('unassigned')
  })
})
