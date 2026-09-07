import { describe, it, expect } from 'vitest'
import { buildComparisonExport, buildComparisonHtml, comparisonFileName } from '../../src/utils/comparisonExport'
import { buildComparison } from '../../src/services/comparison'
import { buildAliasIndex } from '../../src/services/vocabulary'
import designExample from '../data/comparison/design-example-workspace.json'

const PROJECTS = ['project-alpha', 'project-beta', 'project-gamma']

function exportOf(overrides = {}) {
  const { index } = buildAliasIndex(designExample.vocabulary)
  const { rows, metrics } = buildComparison(designExample, PROJECTS, { aliasIndex: index })
  return buildComparisonExport({
    workspace: designExample,
    projects: designExample.projects,
    projectIds: PROJECTS,
    rows,
    metrics,
    dataSource: 'radar',
    visibleKinds: ['tool', 'practice', 'unassigned'],
    exportedAt: '2026-09-07T10:00:00.000Z',
    ...overrides
  })
}

describe('buildComparisonExport', () => {
  it('records the selection the comparison was taken under', () => {
    expect(exportOf().selection).toEqual({
      dataSource: 'radar',
      kinds: ['tool', 'practice', 'unassigned'],
      projects: [
        { id: 'project-alpha', name: 'Alpha' },
        { id: 'project-beta', name: 'Beta' },
        { id: 'project-gamma', name: 'Gamma' }
      ]
    })
  })

  it('carries the metrics unchanged', () => {
    expect(exportOf().metrics).toMatchObject({ total: 38, compared: 32, comparable: 27, agreementPercent: 74 })
  })

  it('has one entry per term, with coverage, Δ and per-project values', () => {
    const data = exportOf()

    expect(data.terms).toHaveLength(38)
    const term = data.terms.find((entry) => entry.projects.some((cell) => cell.values.length))
    expect(term.projects.map((cell) => cell.projectId)).toEqual(PROJECTS)
    expect(term).toHaveProperty('coverage')
    expect(term).toHaveProperty('delta')
  })

  it('carries the overrides in force', () => {
    expect(Object.keys(exportOf().overrides)).toHaveLength(2)
  })

  it('is a stable, self-describing document', () => {
    expect(exportOf()).toMatchObject({
      format: 'solution-inventory-comparison',
      formatVersion: 1,
      exportedAt: '2026-09-07T10:00:00.000Z'
    })
  })
})

// Todo 6.3: a report that leaves the tool must carry its own uncertainty.
describe('unresolved names in the export', () => {
  it('marks every unresolved term', () => {
    const data = exportOf()
    const unresolved = data.terms.filter((term) => term.unresolved)

    expect(unresolved.length).toBeGreaterThan(0)
    unresolved.forEach((term) => expect(term.termId).toBeNull())
  })

  it('states the vocabulary coverage alongside the figures, not instead of them', () => {
    expect(exportOf().metrics.vocabulary).toEqual({ total: 72, resolved: 59, unresolved: 13, percent: 82 })
  })

  it('names the other reasons that applied without counting them twice', () => {
    const data = exportOf()
    data.terms.forEach((term) => expect(term.otherReasons).not.toContain(term.delta))
  })

  it('reports an override whose context has moved on as needing review', () => {
    const { index } = buildAliasIndex(designExample.vocabulary)
    const moved = JSON.parse(JSON.stringify(designExample))
    const overriddenTermId = Object.keys(moved.comparisonOverrides)[0]
    moved.comparisonOverrides[overriddenTermId].contextStatuses = { 'project-alpha': 'Retire' }
    const { rows, metrics } = buildComparison(moved, PROJECTS, { aliasIndex: index })
    const data = buildComparisonExport({
      workspace: moved,
      projects: moved.projects,
      projectIds: PROJECTS,
      rows,
      metrics,
      dataSource: 'radar',
      visibleKinds: ['tool']
    })

    const overridden = data.terms.find((term) => term.termId === overriddenTermId)
    expect(overridden.override.needsReview).toBe(true)
  })
})

describe('buildComparisonHtml', () => {
  const html = buildComparisonHtml(exportOf())

  it('is a standalone document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('</html>')
    expect(html).not.toContain('<script')
  })

  it('names the projects, the data source and the kinds in the header', () => {
    expect(html).toContain('Alpha · Beta · Gamma')
    expect(html).toContain('data source: radar')
    expect(html).toContain('kinds: tool, practice, unassigned')
  })

  it('states the vocabulary coverage prominently', () => {
    expect(html).toContain('Vocabulary coverage</strong> 82 %')
    expect(html).toContain('13 unresolved names')
  })

  it('marks unresolved rows and explains the marker in a footnote', () => {
    expect(html).toContain('◌')
    expect(html).toContain('the vocabulary does not resolve')
  })

  it('escapes content rather than letting it into the markup', () => {
    const data = exportOf()
    data.terms[0].name = '<script>alert(1)</script>'
    const escaped = buildComparisonHtml(data)

    expect(escaped).not.toContain('<script>alert(1)</script>')
    expect(escaped).toContain('&lt;script&gt;')
  })
})

describe('comparisonFileName', () => {
  it('slugifies the project names', () => {
    expect(comparisonFileName(['Alpha Service', 'Beta Portal'], 'json')).toBe(
      'comparison-alpha-service-beta-portal.json'
    )
  })

  it('falls back to a generic name when nothing slugifies', () => {
    expect(comparisonFileName(['***'], 'html')).toBe('comparison-workspace.html')
    expect(comparisonFileName([], 'html')).toBe('comparison-workspace.html')
  })
})
