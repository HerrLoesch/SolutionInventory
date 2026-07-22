import { describe, it, expect } from 'vitest'
import { EXAMPLE_CATALOG, buildCatalogAuthoringPackage, getCatalogSchema } from '../../src/schema/catalogAiSchema'
import { validateCatalog } from '../../src/schema/catalogValidation'

describe('catalogAiSchema — EXAMPLE_CATALOG', () => {
  it('is schema-valid: no errors and no warnings (guards against drift)', () => {
    const { errors, warnings } = validateCatalog(EXAMPLE_CATALOG)
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
  })

  it('has exactly one metadata category', () => {
    const metadata = EXAMPLE_CATALOG.categories.filter((c) => c.isMetadata)
    expect(metadata).toHaveLength(1)
  })
})

describe('catalogAiSchema — buildCatalogAuthoringPackage', () => {
  const pkg = buildCatalogAuthoringPackage()

  it('bundles the authoring rules, the JSON Schema and the worked example', () => {
    expect(pkg).toContain('## Your task')
    expect(pkg).toContain('exactly one') // the metadata-category rule
    expect(pkg).toContain('JSON Schema')
    expect(pkg).toContain('"$schema"') // the embedded schema
    expect(pkg).toContain('catalog-example') // the embedded example id
  })

  it('embeds an example that itself parses as valid JSON', () => {
    const start = pkg.indexOf('## Worked example')
    const block = pkg.slice(pkg.indexOf('```json', start) + 7)
    const json = block.slice(0, block.indexOf('```'))
    expect(() => JSON.parse(json)).not.toThrow()
  })
})

describe('catalogAiSchema — getCatalogSchema', () => {
  it('returns a defensive clone of the schema', () => {
    const a = getCatalogSchema()
    const b = getCatalogSchema()
    expect(a).not.toBe(b)
    expect(a.title).toBeTruthy()
  })
})
