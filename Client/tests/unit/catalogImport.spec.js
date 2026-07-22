import { describe, it, expect } from 'vitest'
import { parseCatalogImport, prepareImportedCatalog } from '../../src/services/catalogImport'
import { getCategoriesData } from '../../src/services/categoriesService'

describe('parseCatalogImport', () => {
  it('parses a bare catalog object', () => {
    const catalog = parseCatalogImport('{"id":"c1","name":"C","categories":[]}')
    expect(catalog.name).toBe('C')
  })

  it('unwraps a { catalog: {...} } envelope', () => {
    const catalog = parseCatalogImport('{"catalog":{"id":"c1","name":"Wrapped"}}')
    expect(catalog.name).toBe('Wrapped')
  })

  it('throws a helpful message on invalid JSON', () => {
    expect(() => parseCatalogImport('{not json')).toThrow(/Not valid JSON/)
  })

  it('throws on empty input', () => {
    expect(() => parseCatalogImport('   ')).toThrow(/No content/)
  })

  it('rejects a top-level array', () => {
    expect(() => parseCatalogImport('[1,2,3]')).toThrow(/catalog object/)
  })
})

describe('prepareImportedCatalog', () => {
  const categoriesData = getCategoriesData()

  it('assigns a fresh catalog id instead of reusing the source id', () => {
    const prepared = prepareImportedCatalog({ id: 'evil-collision', name: 'X', categories: [] }, categoriesData)
    expect(prepared.id).not.toBe('evil-collision')
    expect(prepared.id.startsWith('catalog-')).toBe(true)
  })

  it('fills sensible defaults for fields an AI may omit', () => {
    const prepared = prepareImportedCatalog({ categories: [] }, categoriesData)
    expect(prepared.name).toBe('Imported catalog')
    expect(prepared.version).toBe(1)
    expect(prepared.schemaVersion).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(prepared.statusOptions)).toBe(true)
    expect(prepared.statusOptions.length).toBeGreaterThan(0)
    expect(Array.isArray(prepared.applicabilityOptions)).toBe(true)
    expect(prepared.applicabilityOptions.length).toBeGreaterThan(0)
  })

  it('keeps provided values over defaults', () => {
    const prepared = prepareImportedCatalog(
      { name: 'Keep me', version: 3, applicabilityOptions: ['yes', 'no'], categories: [] },
      categoriesData
    )
    expect(prepared.name).toBe('Keep me')
    expect(prepared.version).toBe(3)
    expect(prepared.applicabilityOptions).toEqual(['yes', 'no'])
  })

  it('normalizes legacy untyped examples to typed practice/tool examples', () => {
    const prepared = prepareImportedCatalog(
      {
        name: 'Legacy',
        categories: [
          {
            id: 'arch',
            title: 'Architecture',
            entries: [
              {
                id: 'e1',
                aspect: 'Style',
                examples: [{ label: 'Layered', description: 'n-tier', tools: ['Spring'] }]
              }
            ]
          }
        ]
      },
      categoriesData
    )
    const examples = prepared.categories[0].entries[0].examples
    expect(examples).toEqual([
      { type: 'practice', label: 'Layered', description: 'n-tier' },
      { type: 'tool', label: 'Spring', description: '' }
    ])
  })

  it('does not mutate the source object', () => {
    const source = { id: 'src', name: 'Src', categories: [] }
    prepareImportedCatalog(source, categoriesData)
    expect(source.id).toBe('src')
  })
})
