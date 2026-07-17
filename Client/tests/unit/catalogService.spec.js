import { describe, it, expect } from 'vitest'
import { getCategoriesData } from '../../src/services/categoriesService'
import {
  stripAnswersFromCategories,
  buildStandardCatalogFromSeed,
  instantiateCatalog,
  expandExampleToTyped,
  expandExamplesToTyped,
  migrateCategoriesExamplesToTyped
} from '../../src/services/catalogService'

describe('stripAnswersFromCategories', () => {
  it('removes instance-only fields but leaves structure intact', () => {
    const categories = [
      {
        id: 'cat-1',
        title: 'Cat',
        entries: [
          {
            id: 'e1',
            aspect: 'Aspect',
            examples: [{ label: 'Example', description: 'd' }],
            answers: [{ technology: 'X', status: 'Adopt', comments: 'c' }],
            applicability: 'applicable',
            entryComment: 'a note'
          }
        ]
      }
    ]
    const stripped = stripAnswersFromCategories(categories)
    expect(stripped[0].entries[0].answers).toBeUndefined()
    expect(stripped[0].entries[0].applicability).toBeUndefined()
    expect(stripped[0].entries[0].entryComment).toBeUndefined()
    expect(stripped[0].entries[0].aspect).toBe('Aspect')
    expect(stripped[0].entries[0].examples).toEqual([{ label: 'Example', description: 'd' }])
  })

  it('does not mutate the input', () => {
    const categories = [{ id: 'c', title: 'C', entries: [{ id: 'e', aspect: 'A', answers: [{ technology: 'X' }] }] }]
    stripAnswersFromCategories(categories)
    expect(categories[0].entries[0].answers).toEqual([{ technology: 'X' }])
  })
})

describe('buildStandardCatalogFromSeed', () => {
  it('builds a catalog with the fixed standard id and answer-free categories', () => {
    const catalog = buildStandardCatalogFromSeed(getCategoriesData())
    expect(catalog.id).toBe('catalog-standard')
    expect(catalog.version).toBe(1)
    expect(catalog.schemaVersion).toBeGreaterThanOrEqual(1)
    expect(catalog.categories.length).toBeGreaterThan(0)

    const nonMetaCategory = catalog.categories.find((c) => !c.isMetadata)
    const entry = nonMetaCategory.entries[0]
    expect(entry.answers).toBeUndefined()
    expect(entry.applicability).toBeUndefined()
  })

  it('carries the seed status options', () => {
    const catalog = buildStandardCatalogFromSeed(getCategoriesData())
    expect(catalog.statusOptions).toEqual(getCategoriesData().statusOptions)
  })
})

describe('instantiateCatalog', () => {
  it('produces a questionnaire tagged with catalog provenance and default answers', () => {
    const catalog = buildStandardCatalogFromSeed(getCategoriesData())
    const questionnaire = instantiateCatalog(catalog, 'My Assessment')

    expect(questionnaire.name).toBe('My Assessment')
    expect(questionnaire.catalogId).toBe(catalog.id)
    expect(questionnaire.catalogVersion).toBe(catalog.version)
    expect(questionnaire.id).toBeTruthy()

    const nonMetaCategory = questionnaire.categories.find((c) => !c.isMetadata)
    const entry = nonMetaCategory.entries[0]
    expect(entry.applicability).toBe('applicable')
    expect(entry.answers).toEqual([{ technology: '', status: '', comments: '' }])
  })

  it('deep-clones the catalog categories — editing the instance must not affect the catalog template', () => {
    const catalog = buildStandardCatalogFromSeed(getCategoriesData())
    const questionnaire = instantiateCatalog(catalog, 'Q')

    const entry = questionnaire.categories.find((c) => !c.isMetadata).entries[0]
    entry.answers[0].technology = 'Mutated'
    entry.aspect = 'Mutated aspect'

    const catalogEntry = catalog.categories.find((c) => !c.isMetadata).entries[0]
    expect(catalogEntry.aspect).not.toBe('Mutated aspect')
    expect(catalogEntry.answers).toBeUndefined()
  })

  it('produces independent instances on repeated calls (no shared answer arrays)', () => {
    const catalog = buildStandardCatalogFromSeed(getCategoriesData())
    const first = instantiateCatalog(catalog, 'First')
    const second = instantiateCatalog(catalog, 'Second')

    const firstEntry = first.categories.find((c) => !c.isMetadata).entries[0]
    firstEntry.answers[0].technology = 'Only in first'

    const secondEntry = second.categories.find((c) => !c.isMetadata).entries[0]
    expect(secondEntry.answers[0].technology).toBe('')
  })
})

describe('expandExampleToTyped', () => {
  it('passes an already-typed example through unchanged', () => {
    const example = { type: 'tool', label: 'Jest', description: 'Test runner' }
    expect(expandExampleToTyped(example)).toEqual([example])
  })

  it('expands a legacy example into one practice example plus one tool example per entry in tools[]', () => {
    const legacy = { label: 'HTTP / RESTful', description: 'Sync request-response.', tools: ['REST APIs', 'OpenAPI'] }
    expect(expandExampleToTyped(legacy)).toEqual([
      { type: 'practice', label: 'HTTP / RESTful', description: 'Sync request-response.' },
      { type: 'tool', label: 'REST APIs', description: '' },
      { type: 'tool', label: 'OpenAPI', description: '' }
    ])
  })

  it('expands a legacy example with an empty/missing tools[] into just the practice example', () => {
    expect(expandExampleToTyped({ label: 'Layered', description: 'x', tools: [] })).toEqual([
      { type: 'practice', label: 'Layered', description: 'x' }
    ])
    expect(expandExampleToTyped({ label: 'Layered' })).toEqual([
      { type: 'practice', label: 'Layered', description: '' }
    ])
  })

  it('drops blank tool entries from a legacy tools[] array', () => {
    expect(expandExampleToTyped({ label: 'X', tools: ['A', '', null, 'B'] })).toEqual([
      { type: 'practice', label: 'X', description: '' },
      { type: 'tool', label: 'A', description: '' },
      { type: 'tool', label: 'B', description: '' }
    ])
  })
})

describe('expandExamplesToTyped', () => {
  it('flattens a mixed array of legacy and typed examples', () => {
    const examples = [
      { label: 'TDD', description: '', tools: ['Jest'] },
      { type: 'tool', label: 'Playwright', description: '' }
    ]
    expect(expandExamplesToTyped(examples)).toEqual([
      { type: 'practice', label: 'TDD', description: '' },
      { type: 'tool', label: 'Jest', description: '' },
      { type: 'tool', label: 'Playwright', description: '' }
    ])
  })

  it('returns an empty array for non-array input', () => {
    expect(expandExamplesToTyped(undefined)).toEqual([])
    expect(expandExamplesToTyped(null)).toEqual([])
  })
})

describe('migrateCategoriesExamplesToTyped', () => {
  it('replaces every entry examples[] in place with the typed, expanded form', () => {
    const categories = [
      {
        id: 'cat-1',
        title: 'Cat',
        entries: [
          { id: 'e1', aspect: 'A', examples: [{ label: 'X', description: '', tools: ['Tool A'] }] },
          { id: 'e2', aspect: 'B', examples: [{ type: 'practice', label: 'Already typed', description: '' }] }
        ]
      }
    ]

    migrateCategoriesExamplesToTyped(categories)

    expect(categories[0].entries[0].examples).toEqual([
      { type: 'practice', label: 'X', description: '' },
      { type: 'tool', label: 'Tool A', description: '' }
    ])
    expect(categories[0].entries[1].examples).toEqual([{ type: 'practice', label: 'Already typed', description: '' }])
  })

  it('is a no-op for entries without an examples array', () => {
    const categories = [{ id: 'c', title: 'C', entries: [{ id: 'e', aspect: 'A' }] }]
    expect(() => migrateCategoriesExamplesToTyped(categories)).not.toThrow()
    expect(categories[0].entries[0].examples).toBeUndefined()
  })
})
