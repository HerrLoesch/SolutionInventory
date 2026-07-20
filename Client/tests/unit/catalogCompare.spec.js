import { describe, it, expect } from 'vitest'
import { compareCatalogs } from '../../src/services/catalogCompare'

function catalog(categories, metadataOptions) {
  return {
    id: 'c',
    name: 'C',
    categories: [
      { id: 'context', title: 'Context', isMetadata: true, metadataOptions: metadataOptions || {} },
      ...categories
    ]
  }
}

const refCat = catalog(
  [
    {
      id: 'architecture',
      title: 'Architecture',
      entries: [
        { id: 'arch-1', aspect: 'Style', description: 'How structured' },
        { id: 'arch-2', aspect: 'API', description: 'How exposed' }
      ]
    }
  ],
  { executionType: [{ label: 'Web Application' }, { label: 'Headless Service / API' }] }
)

describe('compareCatalogs — no reference', () => {
  it('reports hasReference: false and identical when reference is missing', () => {
    const result = compareCatalogs(refCat, null)
    expect(result.hasReference).toBe(false)
    expect(result.summary.identical).toBe(true)
  })
})

describe('compareCatalogs — identical', () => {
  it('reports no differences comparing a catalog to itself', () => {
    const result = compareCatalogs(refCat, refCat)
    expect(result.hasReference).toBe(true)
    expect(result.summary.identical).toBe(true)
    expect(result.summary.totalChanges).toBe(0)
  })
})

describe('compareCatalogs — category-level differences', () => {
  it('detects added and removed categories', () => {
    const imported = catalog([
      // architecture removed, security added
      {
        id: 'security',
        title: 'Security',
        entries: [{ id: 'sec-1', aspect: 'AuthN' }]
      }
    ])
    const result = compareCatalogs(imported, refCat)
    expect(result.categoriesAdded.map((c) => c.id)).toContain('security')
    expect(result.categoriesRemoved.map((c) => c.id)).toContain('architecture')
    expect(result.summary.identical).toBe(false)
  })
})

describe('compareCatalogs — entry-level differences', () => {
  it('detects added, removed and changed entries within a shared category', () => {
    const imported = catalog([
      {
        id: 'architecture',
        title: 'Architecture',
        entries: [
          { id: 'arch-1', aspect: 'Architectural Style', description: 'How structured' }, // aspect changed
          // arch-2 removed
          { id: 'arch-3', aspect: 'Scaling' } // added
        ]
      }
    ])
    const result = compareCatalogs(imported, refCat)
    const changed = result.categoriesChanged.find((c) => c.id === 'architecture')
    expect(changed.entriesAdded.map((e) => e.id)).toEqual(['arch-3'])
    expect(changed.entriesRemoved.map((e) => e.id)).toEqual(['arch-2'])
    expect(changed.entriesChanged[0]).toMatchObject({ id: 'arch-1', changes: ['aspect'] })
    expect(result.summary.entriesAdded).toBe(1)
    expect(result.summary.entriesRemoved).toBe(1)
    expect(result.summary.entriesChanged).toBe(1)
  })
})

describe('compareCatalogs — metadata vocabulary', () => {
  it('detects added/removed metadata option values', () => {
    const imported = catalog(
      [
        {
          id: 'architecture',
          title: 'Architecture',
          entries: [
            { id: 'arch-1', aspect: 'Style', description: 'How structured' },
            { id: 'arch-2', aspect: 'API', description: 'How exposed' }
          ]
        }
      ],
      { executionType: [{ label: 'Web Application' }, { label: 'Mobile Application' }] }
    )
    const result = compareCatalogs(imported, refCat)
    const change = result.metadata.valuesChanged.find((v) => v.field === 'executionType')
    expect(change.added).toContain('Mobile Application')
    expect(change.removed).toContain('Headless Service / API')
    expect(result.summary.metadataChanges).toBeGreaterThan(0)
  })
})
