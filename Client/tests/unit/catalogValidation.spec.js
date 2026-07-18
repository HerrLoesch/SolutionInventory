import { describe, it, expect } from 'vitest'
import { getCategoriesData } from '../../src/services/categoriesService'
import { buildStandardCatalogFromSeed, buildInterviewCatalog } from '../../src/services/catalogService'
import { validateCatalog } from '../../src/schema/catalogValidation'

function baseCatalog(overrides = {}) {
  return {
    id: 'cat-1',
    name: 'Test Catalog',
    version: 1,
    schemaVersion: 1,
    categories: [
      { id: 'meta', title: 'Metadata', isMetadata: true },
      {
        id: 'architecture',
        title: 'Architecture',
        entries: [{ id: 'arch-1', aspect: 'Aspect 1' }]
      }
    ],
    ...overrides
  }
}

describe('validateCatalog — fixture check (§3.2 point 3)', () => {
  it('the shipped standard catalog is schema-valid (no errors)', () => {
    const catalog = buildStandardCatalogFromSeed(getCategoriesData())
    const { errors } = validateCatalog(catalog)
    expect(errors).toEqual([])
  })

  it('the shipped interview catalog is schema-valid (no errors and no warnings)', () => {
    const catalog = buildInterviewCatalog()
    const { errors, warnings } = validateCatalog(catalog)
    // No errors is the hard requirement; the interview catalog is also
    // authored to raise zero warnings (every appliesTo field/value matches the
    // metadata category's options), so guard that too — a warning here means a
    // typo drifted an appliesTo away from the metadataOptions vocabulary.
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
  })
})

describe('validateCatalog — required fields', () => {
  it('accepts a minimal valid catalog with no errors', () => {
    const { errors } = validateCatalog(baseCatalog())
    expect(errors).toEqual([])
  })

  it('reports missing id, name, version, schemaVersion', () => {
    const { errors } = validateCatalog({ categories: baseCatalog().categories })
    const paths = errors.map((e) => e.path)
    expect(paths).toEqual(expect.arrayContaining(['id', 'name', 'version', 'schemaVersion']))
  })

  it('reports an empty categories array', () => {
    const { errors } = validateCatalog(baseCatalog({ categories: [] }))
    expect(errors.some((e) => e.path === 'categories')).toBe(true)
  })
})

describe('validateCatalog — metadata category count', () => {
  it('reports an error when no category is marked isMetadata', () => {
    const catalog = baseCatalog({
      categories: [{ id: 'architecture', title: 'Architecture', entries: [{ id: 'a', aspect: 'A' }] }]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /exactly one metadata category, found none/.test(e.message))).toBe(true)
  })

  it('reports an error when more than one category is marked isMetadata', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta-1', title: 'Meta 1', isMetadata: true },
        { id: 'meta-2', title: 'Meta 2', isMetadata: true }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /exactly one metadata category, found 2/.test(e.message))).toBe(true)
  })
})

describe('validateCatalog — category rules', () => {
  it('reports duplicate category ids', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        { id: 'dup', title: 'A', entries: [{ id: 'e1', aspect: 'A1' }] },
        { id: 'dup', title: 'B', entries: [{ id: 'e2', aspect: 'B1' }] }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /Duplicate category id "dup"/.test(e.message))).toBe(true)
  })

  it('reports category ids that do not match ^[a-z0-9-]+$', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        { id: 'Bad Id!', title: 'Bad', entries: [{ id: 'e1', aspect: 'A' }] }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /must match/.test(e.message))).toBe(true)
  })

  it('errors when a non-metadata category has no entries array at all', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        { id: 'architecture', title: 'Architecture' }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /must have an entries array/.test(e.message))).toBe(true)
  })

  it('warns (does not error) when a non-metadata category has an empty entries array', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        { id: 'architecture', title: 'Architecture', entries: [] }
      ]
    })
    const { errors, warnings } = validateCatalog(catalog)
    expect(errors).toEqual([])
    expect(warnings.some((w) => /no entries yet/.test(w.message))).toBe(true)
  })
})

describe('validateCatalog — entry rules', () => {
  it('reports duplicate entry ids within the same category', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [
            { id: 'dup', aspect: 'A' },
            { id: 'dup', aspect: 'B' }
          ]
        }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /Duplicate entry id "dup"/.test(e.message))).toBe(true)
  })

  it('allows the same entry id to be reused across different categories', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        { id: 'architecture', title: 'Architecture', entries: [{ id: 'shared', aspect: 'A' }] },
        { id: 'frontend', title: 'Frontend', entries: [{ id: 'shared', aspect: 'B' }] }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors).toEqual([])
  })

  it('reports a missing entry aspect', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        { id: 'architecture', title: 'Architecture', entries: [{ id: 'e1' }] }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /aspect is required/.test(e.message))).toBe(true)
  })

  it('reports an example with no label', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [{ id: 'e1', aspect: 'A', examples: [{ description: 'no label' }] }]
        }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /Example label is required/.test(e.message))).toBe(true)
  })

  it('accepts a typed example (type: "practice" | "tool") with no errors', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [
            {
              id: 'e1',
              aspect: 'A',
              examples: [
                { type: 'practice', label: 'TDD', description: '' },
                { type: 'tool', label: 'Jest', description: '' }
              ]
            }
          ]
        }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors).toEqual([])
  })

  it('still accepts an untyped legacy example (label + nested tools[]) with no errors', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [{ id: 'e1', aspect: 'A', examples: [{ label: 'HTTP', description: '', tools: ['REST'] }] }]
        }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors).toEqual([])
  })

  it('reports an example with an invalid type value', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true },
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [{ id: 'e1', aspect: 'A', examples: [{ type: 'bogus', label: 'X' }] }]
        }
      ]
    })
    const { errors } = validateCatalog(catalog)
    expect(errors.some((e) => /type must be "practice" or "tool"/.test(e.message))).toBe(true)
  })
})

describe('validateCatalog — appliesTo (warnings only)', () => {
  it('warns about an appliesTo field not declared in metadataOptions, but does not error', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true, metadataOptions: { executionType: [{ label: 'Web' }] } },
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [{ id: 'e1', aspect: 'A', appliesTo: { unknownField: 'X' } }]
        }
      ]
    })
    const { errors, warnings } = validateCatalog(catalog)
    expect(errors).toEqual([])
    expect(warnings.some((w) => /unknown metadata field "unknownField"/.test(w.message))).toBe(true)
  })

  it('warns about an appliesTo value not present in the declared options', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true, metadataOptions: { executionType: [{ label: 'Web' }] } },
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [{ id: 'e1', aspect: 'A', appliesTo: { executionType: ['Nonexistent'] } }]
        }
      ]
    })
    const { errors, warnings } = validateCatalog(catalog)
    expect(errors).toEqual([])
    expect(warnings.some((w) => /not one of the declared options/.test(w.message))).toBe(true)
  })

  it('accepts an appliesTo value that matches a declared option', () => {
    const catalog = baseCatalog({
      categories: [
        { id: 'meta', title: 'Metadata', isMetadata: true, metadataOptions: { executionType: [{ label: 'Web' }] } },
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [{ id: 'e1', aspect: 'A', appliesTo: { executionType: ['Web'] } }]
        }
      ]
    })
    const { warnings } = validateCatalog(catalog)
    expect(warnings).toEqual([])
  })
})
