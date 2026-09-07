import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { exportRadarHtml, generateCustomRadarHtml, downloadCustomRadarHtml } from '../../src/utils/techRadarExport'

function makeBlip(overrides = {}) {
  return {
    key: 'e1||Vue',
    name: 'Vue',
    index: 1,
    ring: 0,
    ringColor: '#4caf50',
    x: 100,
    y: 100,
    statusLabel: 'Adopt',
    categoryTitle: 'Architecture',
    questionnaireName: 'Q1',
    infoUrl: '',
    mandatory: false,
    comment: '',
    shortComment: '',
    radarComment: '',
    ...overrides
  }
}

// jsdom's Blob implementation doesn't reliably support .text()/.arrayBuffer(),
// so capture the raw string content at construction time instead of reading it
// back out of the Blob.
let capturedContents
let OriginalBlob
beforeEach(() => {
  capturedContents = []
  OriginalBlob = global.Blob
  global.Blob = class MockBlob extends OriginalBlob {
    constructor(parts, opts) {
      super(parts, opts)
      capturedContents.push(parts.join(''))
    }
  }
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => {
  global.Blob = OriginalBlob
  vi.restoreAllMocks()
})

describe('exportRadarHtml', () => {
  it('embeds only visible rings and their labels in the generated SVG', async () => {
    exportRadarHtml({
      title: 'My Radar',
      blips: [makeBlip()],
      rings: [0, 132, 330],
      visibleRingIndices: [0, 3], // Adopt + Hold only
      effectiveQuadrantLabels: { 0: 'Frontend', 1: '', 2: '', 3: '' },
      blipsByQuadrant: [
        {
          quadrant: 0,
          label: 'Frontend',
          statusGroups: [{ ring: 0, statusLabel: 'Adopt', color: '#4caf50', blips: [makeBlip()] }]
        }
      ]
    })

    expect(capturedContents).toHaveLength(1)
    const html = capturedContents[0]

    expect(html).toContain('ADOPT')
    expect(html).toContain('HOLD')
    expect(html).not.toContain('>TRIAL<')
    expect(html).not.toContain('>ASSESS<')
    expect(html).not.toContain('>RETIRE<')
    expect(html).toContain('FRONTEND')
    expect(html).toContain('Tech Radar – My Radar')
  })

  it('renders a clickable link wrapper around blips that have a valid infoUrl', async () => {
    exportRadarHtml({
      title: 'R',
      blips: [makeBlip({ infoUrl: 'example.com/page' })],
      rings: [0, 330],
      visibleRingIndices: [0],
      effectiveQuadrantLabels: { 0: '', 1: '', 2: '', 3: '' },
      blipsByQuadrant: []
    })
    const html = capturedContents[0]
    expect(html).toContain('href="https://example.com/page"')
    expect(html).toContain('class="blip-link"')
  })

  it('omits the link wrapper when infoUrl is empty or invalid', async () => {
    exportRadarHtml({
      title: 'R',
      blips: [makeBlip({ infoUrl: 'javascript:alert(1)' })],
      rings: [0, 330],
      visibleRingIndices: [0],
      effectiveQuadrantLabels: { 0: '', 1: '', 2: '', 3: '' },
      blipsByQuadrant: []
    })
    const html = capturedContents[0]
    expect(html).not.toContain('blip-link')
    expect(html).not.toContain('javascript:')
  })

  it('escapes unsafe characters in the title', async () => {
    exportRadarHtml({
      title: '<script>alert(1)</script>',
      blips: [],
      rings: [0, 330],
      visibleRingIndices: [0],
      effectiveQuadrantLabels: { 0: '', 1: '', 2: '', 3: '' },
      blipsByQuadrant: []
    })
    const html = capturedContents[0]
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('generateCustomRadarHtml', () => {
  const baseOptions = () => ({
    categoryGroups: [{ categories: ['Architecture'], label: 'Architecture', included: true }],
    statusLabels: {},
    includedStatuses: ['adopt', 'trial', 'assess', 'hold', 'retire'],
    gridColumns: 3,
    showGroupToggle: true,
    showSearch: false
  })

  it('filters out blips whose category or status is not included', () => {
    const blips = [
      makeBlip({ key: 'a', name: 'Included', categoryTitle: 'Architecture', ring: 0 }), // Adopt
      makeBlip({ key: 'b', name: 'WrongCategory', categoryTitle: 'Other', ring: 0 }), // Adopt, wrong category
      makeBlip({ key: 'c', name: 'WrongStatus', categoryTitle: 'Architecture', ring: 1 }) // Trial, right category
    ]
    const html = generateCustomRadarHtml({ title: 'T', blips }, { ...baseOptions(), includedStatuses: ['adopt'] })
    expect(html).toContain('Included')
    expect(html).not.toContain('WrongCategory')
    expect(html).not.toContain('WrongStatus')
  })

  it('re-indexes filtered blips sequentially starting at 1', () => {
    const blips = [
      makeBlip({ key: 'a', name: 'First', index: 99, categoryTitle: 'Architecture' }),
      makeBlip({ key: 'b', name: 'Second', index: 5, categoryTitle: 'Architecture' })
    ]
    const html = generateCustomRadarHtml({ title: 'T', blips }, baseOptions())
    expect(html).toMatch(/blip-badge[^>]*>1</)
    expect(html).toMatch(/blip-badge[^>]*>2</)
  })

  it('clamps gridColumns to the 1-6 range', () => {
    const blips = [makeBlip({ categoryTitle: 'Architecture' })]
    const tooMany = generateCustomRadarHtml({ title: 'T', blips }, { ...baseOptions(), gridColumns: 99 })
    expect(tooMany).toContain('grid-template-columns:repeat(6,1fr)')

    // A negative value clamps to the floor of 1.
    const negative = generateCustomRadarHtml({ title: 'T', blips }, { ...baseOptions(), gridColumns: -5 })
    expect(negative).toContain('grid-template-columns:repeat(1,1fr)')
  })

  it('falls back to the 3-column default when gridColumns is 0 (falsy short-circuit)', () => {
    // `parseInt(gridColumns) || 3` treats 0 as falsy, so it resolves to the
    // default of 3 rather than clamping to the floor of 1 like other low values.
    const blips = [makeBlip({ categoryTitle: 'Architecture' })]
    const html = generateCustomRadarHtml({ title: 'T', blips }, { ...baseOptions(), gridColumns: 0 })
    expect(html).toContain('grid-template-columns:repeat(3,1fr)')
  })

  it('marks mandatory blips with the mandatory label and binding style', () => {
    const blips = [makeBlip({ categoryTitle: 'Architecture', mandatory: true })]
    const html = generateCustomRadarHtml(
      { title: 'T', blips },
      { ...baseOptions(), showBindingLevel: true, labels: { mandatory: 'Pflicht', recommendation: 'Empfehlung' } }
    )
    expect(html).toContain('Pflicht')
    expect(html).toContain('blip-binding--mandatory')
    expect(html).not.toContain('>Empfehlung<')
  })

  it('omits the binding badge markup entirely when showBindingLevel is false', () => {
    const blips = [makeBlip({ categoryTitle: 'Architecture', mandatory: true })]
    const html = generateCustomRadarHtml({ title: 'T', blips }, { ...baseOptions(), showBindingLevel: false })
    // The stylesheet still defines the .blip-binding rules unconditionally,
    // but no card should render the <span class="blip-binding..."> element.
    expect(html).not.toMatch(/<span class="blip-binding/)
  })

  it('falls back to legacy includedCategories when categoryGroups is absent', () => {
    const blips = [makeBlip({ categoryTitle: 'Legacy Category' })]
    const html = generateCustomRadarHtml(
      { title: 'T', blips },
      { includedCategories: ['Legacy Category'], includedStatuses: ['adopt'], gridColumns: 3, showGroupToggle: false }
    )
    expect(html).toContain('Legacy Category')
  })

  it('renders a search box and its filter script only when showSearch is true', () => {
    const blips = [makeBlip({ categoryTitle: 'Architecture' })]
    const withSearch = generateCustomRadarHtml({ title: 'T', blips }, { ...baseOptions(), showSearch: true })
    expect(withSearch).toContain('class="search-input"')
    expect(withSearch).toContain('addEventListener')

    const withoutSearch = generateCustomRadarHtml({ title: 'T', blips }, { ...baseOptions(), showSearch: false })
    expect(withoutSearch).not.toContain('search-input')
  })

  it('renders markdown in the blip comment as HTML', () => {
    const blips = [makeBlip({ categoryTitle: 'Architecture', shortComment: '**bold** text' })]
    const html = generateCustomRadarHtml({ title: 'T', blips }, baseOptions())
    expect(html).toContain('<strong>bold</strong>')
  })

  it('static mode with search off contains no <script> tag (no-JS guarantee)', () => {
    const blips = [makeBlip({ categoryTitle: 'Architecture' })]
    const html = generateCustomRadarHtml(
      { title: 'T', blips },
      { ...baseOptions(), exportMode: 'static', showSearch: false }
    )
    expect(html).not.toContain('<script')
  })
})

describe('generateCustomRadarHtml – JSON data-island mode', () => {
  const jsonOptions = () => ({
    exportMode: 'json',
    categoryGroups: [
      { key: 'g1', categories: ['Architecture'], label: 'Architecture', included: true },
      { key: 'g2', categories: ['Data'], label: 'Data', included: true }
    ],
    statusLabels: { adopt: 'Adopt', trial: 'Trial', assess: 'Assess', hold: 'Hold', retire: 'Retire' },
    statusColors: { adopt: '#4caf50', trial: '#2196f3', assess: '#ff9800', hold: '#9e9e9e', retire: '#f44336' },
    includedStatuses: ['adopt', 'trial'],
    gridColumns: 3,
    showGroupToggle: true,
    showSearch: false
  })

  function extractIsland(html) {
    const m = html.match(/<script type="application\/json" id="radar-data">\n([\s\S]*?)\n {4}<\/script>/)
    if (!m) throw new Error('data island not found')
    return JSON.parse(m[1])
  }

  it('embeds an editable JSON data island plus an inline renderer', () => {
    const blips = [makeBlip({ name: 'Vue', categoryTitle: 'Architecture', ring: 0 })]
    const html = generateCustomRadarHtml({ title: 'T', blips }, jsonOptions())
    expect(html).toContain('id="radar-data"')
    expect(html).toContain('function statusView')
    expect(html).toContain("document.getElementById('radar-data')")
  })

  it('serialises filtered blips with status key + group label into the island', () => {
    const blips = [
      makeBlip({ name: 'Vue', categoryTitle: 'Architecture', ring: 0 }), // adopt, included
      makeBlip({ name: 'Nuxt', categoryTitle: 'Architecture', ring: 1 }), // trial, included
      makeBlip({ name: 'Old', categoryTitle: 'Architecture', ring: 3 }) // hold, excluded
    ]
    const data = extractIsland(generateCustomRadarHtml({ title: 'T', blips }, jsonOptions()))
    expect(data.blips.map((b) => b.name)).toEqual(['Vue', 'Nuxt'])
    expect(data.blips[0]).toMatchObject({ name: 'Vue', status: 'adopt', category: 'Architecture' })
    expect(data.config.statuses.map((s) => s.key)).toEqual(['adopt', 'trial'])
    expect(data.config.categoryOrder).toEqual(['Architecture', 'Data'])
  })

  it('escapes a closing script tag that appears inside blip data', () => {
    const blips = [makeBlip({ categoryTitle: 'Architecture', shortComment: 'x </script> y' })]
    const html = generateCustomRadarHtml({ title: 'T', blips }, jsonOptions())
    // The island body (up to its own closing tag) must not contain a raw
    // </script> that would break out of the data island early.
    const start = html.indexOf('id="radar-data"')
    const island = html.slice(start, html.indexOf('</script>', start))
    expect(island).not.toContain('</script>')
    expect(island).toContain('<\\/script>')
  })

  it('respects showSearch in JSON mode by emitting the search input + config flag', () => {
    const blips = [makeBlip({ categoryTitle: 'Architecture' })]
    const html = generateCustomRadarHtml({ title: 'T', blips }, { ...jsonOptions(), showSearch: true })
    expect(html).toContain('class="search-input"')
    expect(extractIsland(html).config.showSearch).toBe(true)
  })

  it('inline renderer rebuilds the cards in the DOM from the data island', () => {
    const blips = [
      makeBlip({ name: 'Vue', categoryTitle: 'Architecture', ring: 0 }),
      makeBlip({ name: 'Nuxt', categoryTitle: 'Data', ring: 1 })
    ]
    const html = generateCustomRadarHtml({ title: 'T', blips }, jsonOptions())
    const islandText = html.match(/<script type="application\/json" id="radar-data">\n([\s\S]*?)\n {4}<\/script>/)[1]
    const rendererBody = html.match(/ {2}<script>\n([\s\S]*?)\n {2}<\/script>\n<\/body>/)[1]

    document.body.innerHTML =
      '<div class="view-status"></div><div class="view-category"></div>' +
      '<script type="application/json" id="radar-data"></script>'
    document.getElementById('radar-data').textContent = islandText
    new Function(rendererBody)()

    expect(document.querySelectorAll('.view-status .blip-card').length).toBe(2)
    expect(document.querySelector('.view-status').textContent).toContain('Vue')
    // Two categories => two sections in the by-category view
    expect(document.querySelectorAll('.view-category .ring-section').length).toBe(2)
  })
})

describe('downloadCustomRadarHtml', () => {
  it('triggers a Blob download with a slugified filename derived from the title', () => {
    downloadCustomRadarHtml(
      { title: 'My Project!', blips: [] },
      { categoryGroups: [], includedStatuses: [], gridColumns: 3, showGroupToggle: false }
    )
    expect(capturedContents).toHaveLength(1)
  })
})

// ── Kind selection in the header (Todo 6.2) ──────────────────────────────────
//
// The one change to an *existing* export. Additive: the tests above pin today's
// format and must keep passing unchanged.
describe('exportRadarHtml — kind selection', () => {
  function htmlWith(visibleKinds) {
    let captured = ''
    const originalCreate = document.createElement.bind(document)
    const blobs = []
    const originalBlob = global.Blob
    global.Blob = class {
      constructor(parts) {
        blobs.push(parts.join(''))
      }
    }
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = () => 'blob:test'
    URL.revokeObjectURL = () => {}
    document.createElement = (tag) => {
      const element = originalCreate(tag)
      if (tag === 'a') element.click = () => {}
      return element
    }
    try {
      exportRadarHtml({
        title: 'Demo',
        blips: [],
        rings: [0, 30, 60, 90, 120, 150],
        visibleRingIndices: [0, 1, 2, 3, 4],
        effectiveQuadrantLabels: ['A', 'B', 'C', 'D'],
        blipsByQuadrant: [],
        visibleKinds
      })
      captured = blobs[blobs.length - 1] || ''
    } finally {
      document.createElement = originalCreate
      global.Blob = originalBlob
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevoke
    }
    return captured
  }

  it('states a narrowed kind selection in the header', () => {
    expect(htmlWith(['tool'])).toContain('kinds: tool')
  })

  it('says nothing when every kind is shown — the header stays as it was', () => {
    expect(htmlWith(['tool', 'practice', 'unassigned'])).not.toContain('kinds:')
  })

  it('says nothing when no selection is passed at all', () => {
    expect(htmlWith(undefined)).not.toContain('kinds:')
  })
})
