import { describe, it, expect } from 'vitest'
import { getCategoriesData } from '../../src/services/categoriesService'

describe('categoriesService.getCategoriesData', () => {
  it('returns the five canonical status options in order', () => {
    const { statusOptions } = getCategoriesData()
    expect(statusOptions.map((s) => s.label)).toEqual(['Adopt', 'Trial', 'Assess', 'Hold', 'Retire'])
    statusOptions.forEach((option) => {
      expect(typeof option.description).toBe('string')
      expect(option.description.length).toBeGreaterThan(0)
    })
  })

  it('has exactly one metadata category with the solution-desc id', () => {
    const { categories } = getCategoriesData()
    const metadataCategories = categories.filter((c) => c.isMetadata)
    expect(metadataCategories).toHaveLength(1)
    expect(metadataCategories[0].id).toBe('solution-desc')
  })

  it('metadata category defines options for every field referenced by appliesTo filters', () => {
    const { categories } = getCategoriesData()
    const meta = categories.find((c) => c.isMetadata)
    expect(meta.metadataOptions.executionType[0].label).toBe('Not specified')
    expect(meta.metadataOptions.architecturalRole[0].label).toBe('Not specified')

    const executionTypeLabels = new Set(meta.metadataOptions.executionType.map((o) => o.label))
    const architecturalRoleLabels = new Set(meta.metadataOptions.architecturalRole.map((o) => o.label))

    for (const category of categories) {
      for (const entry of category.entries || []) {
        const appliesTo = entry.appliesTo
        if (!appliesTo) continue
        for (const value of appliesTo.executionType || []) {
          expect(executionTypeLabels.has(value), `Unknown executionType "${value}" on entry ${entry.id}`).toBe(true)
        }
        for (const value of appliesTo.architecturalRole || []) {
          expect(architecturalRoleLabels.has(value), `Unknown architecturalRole "${value}" on entry ${entry.id}`).toBe(
            true
          )
        }
      }
    }
  })

  it('has unique category ids', () => {
    const { categories } = getCategoriesData()
    const ids = categories.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique entry ids across all categories', () => {
    const { categories } = getCategoriesData()
    const ids = categories.flatMap((c) => (c.entries || []).map((e) => e.id))
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every non-metadata entry has a seed answer and an aspect label', () => {
    const { categories } = getCategoriesData()
    for (const category of categories) {
      if (category.isMetadata) continue
      expect(Array.isArray(category.entries)).toBe(true)
      for (const entry of category.entries) {
        expect(entry.id).toBeTruthy()
        expect(entry.aspect).toBeTruthy()
        expect(Array.isArray(entry.answers)).toBe(true)
        expect(entry.answers.length).toBeGreaterThan(0)
        expect(entry.answers[0]).toMatchObject({ technology: '', status: '', comments: '' })
      }
    }
  })

  it('returns independent copies on repeated calls (no shared mutable state)', () => {
    const first = getCategoriesData()
    const second = getCategoriesData()
    expect(first.categories).not.toBe(second.categories)
    expect(first.categories[0]).not.toBe(second.categories[0])

    // Mutating one call's data must not leak into a fresh call.
    first.categories[0].title = 'MUTATED'
    expect(second.categories[0].title).not.toBe('MUTATED')
  })
})
