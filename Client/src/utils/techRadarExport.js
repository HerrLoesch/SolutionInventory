// Tech Radar standalone HTML export utility.
// Plain JS module – no Vue SFC parser involved, so HTML tag strings are safe.

import MarkdownIt from 'markdown-it'

const SIZE = 720
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = SIZE / 2 - 30
const BLIP_R = 12

const Q_ANGLES = [
  { a1: -Math.PI / 2, a2: 0 },
  { a1: -Math.PI, a2: -Math.PI / 2 },
  { a1: Math.PI / 2, a2: Math.PI },
  { a1: 0, a2: Math.PI / 2 }
]

const RING_META = [
  { label: 'Adopt', color: '#4caf50' },
  { label: 'Trial', color: '#2196f3' },
  { label: 'Assess', color: '#ff9800' },
  { label: 'Hold', color: '#9e9e9e' },
  { label: 'Retire', color: '#f44336' }
]

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const defaultLinkOpen = markdownRenderer.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))
markdownRenderer.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

function arcPath (cx, cy, innerR, outerR, a1, a2) {
  const cos1 = Math.cos(a1), sin1 = Math.sin(a1)
  const cos2 = Math.cos(a2), sin2 = Math.sin(a2)
  if (innerR <= 0) {
    return [
      `M ${cx},${cy}`,
      `L ${cx + outerR * cos1} ${cy + outerR * sin1}`,
      `A ${outerR},${outerR} 0 0,1 ${cx + outerR * cos2} ${cy + outerR * sin2}`,
      'Z'
    ].join(' ')
  }
  return [
    `M ${cx + innerR * cos1} ${cy + innerR * sin1}`,
    `A ${innerR},${innerR} 0 0,1 ${cx + innerR * cos2} ${cy + innerR * sin2}`,
    `L ${cx + outerR * cos2} ${cy + outerR * sin2}`,
    `A ${outerR},${outerR} 0 0,0 ${cx + outerR * cos1} ${cy + outerR * sin1}`,
    'Z'
  ].join(' ')
}

function esc (s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeLink (value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.href
  } catch {
    return ''
  }
}

function getCommentMarkdown (blip) {
  return String(blip.radarComment || blip.shortComment || blip.comment || '').trim()
}

function renderMarkdownComment (value) {
  const source = String(value || '').trim()
  if (!source) return ''
  return markdownRenderer.render(source)
}

/**
 * Generate and trigger download of a self-contained HTML Tech Radar page.
 *
 * @param {object} params
 * @param {string}   params.title
 * @param {Array}    params.blips              positionedBlips (with x, y, ringColor, index, …)
 * @param {number[]} params.rings              computedRings radii array
 * @param {number[]} params.visibleRingIndices indices into RING_META that are currently visible
 * @param {object}   params.effectiveQuadrantLabels  { 0: label, 1: label, … }
 * @param {Array}    params.blipsByQuadrant    grouped blip data for the legend
 */
export function exportRadarHtml ({ title, blips, rings, visibleRingIndices, effectiveQuadrantLabels, blipsByQuadrant }) {
  const cr = rings
  const visIdx = visibleRingIndices
  const effLabels = effectiveQuadrantLabels

  const RING_FILLS = [
    'rgba(76,175,80,0.15)', 'rgba(33,150,243,0.10)',
    'rgba(255,152,0,0.10)', 'rgba(158,158,158,0.10)', 'rgba(244,67,54,0.08)'
  ]
  const Q_COLORS = ['#2196f3', '#4caf50', '#ff9800', '#9e9e9e']

  // ── SVG ────────────────────────────────────────────────────────────────
  const svgParts = []
  svgParts.push(`<svg id="radar-svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">`)
  svgParts.push(`  <defs><clipPath id="radar-clip"><circle cx="${CX}" cy="${CY}" r="${OUTER_R}"/></clipPath></defs>`)
  svgParts.push(`  <circle cx="${CX}" cy="${CY}" r="${OUTER_R + 2}" fill="#f5f5f5"/>`)

  // Ring fills (outside-in)
  ;[...visIdx].reverse().forEach(origIdx => {
    const newIdx = visIdx.indexOf(origIdx)
    svgParts.push(`  <circle cx="${CX}" cy="${CY}" r="${cr[newIdx + 1]}" fill="${RING_FILLS[origIdx]}"/>`)
  })

  // Quadrant tints
  Q_ANGLES.forEach((qa, qi) => {
    svgParts.push(`  <path d="${arcPath(CX, CY, 0, OUTER_R, qa.a1, qa.a2)}" fill="${Q_COLORS[qi]}" opacity="0.04"/>`)
  })

  // Ring boundary circles
  cr.slice(1).forEach(r => {
    svgParts.push(`  <circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="0.8"/>`)
  })

  // Divider lines
  svgParts.push(`  <line x1="${CX}" y1="${CY - OUTER_R}" x2="${CX}" y2="${CY + OUTER_R}" stroke="rgba(0,0,0,0.12)" stroke-width="1.2"/>`)
  svgParts.push(`  <line x1="${CX - OUTER_R}" y1="${CY}" x2="${CX + OUTER_R}" y2="${CY}" stroke="rgba(0,0,0,0.12)" stroke-width="1.2"/>`)

  // Ring labels
  visIdx.forEach((origIdx, newIdx) => {
    const meta = RING_META[origIdx]
    const yPos = CY - (cr[newIdx] + cr[newIdx + 1]) / 2
    svgParts.push(`  <text x="${CX}" y="${yPos.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="1" fill="${meta.color}">${meta.label.toUpperCase()}</text>`)
  })

  // Quadrant corner labels
  const Q_LABEL_POSITIONS = [
    { x: CX + OUTER_R - 12, y: CY - OUTER_R + 18, anchor: 'end' },
    { x: CX - OUTER_R + 12, y: CY - OUTER_R + 18, anchor: 'start' },
    { x: CX - OUTER_R + 12, y: CY + OUTER_R - 10, anchor: 'start' },
    { x: CX + OUTER_R - 12, y: CY + OUTER_R - 10, anchor: 'end' }
  ]
  Q_LABEL_POSITIONS.forEach((pos, i) => {
    if (effLabels[i]) {
      svgParts.push(`  <text x="${pos.x}" y="${pos.y}" text-anchor="${pos.anchor}" font-family="sans-serif" font-size="11" font-weight="600" fill="rgba(0,0,0,0.45)">${esc(effLabels[i].toUpperCase())}</text>`)
    }
  })

  // Blips
  blips.forEach(blip => {
    const tipLines = [blip.name]
    if (blip.statusLabel) tipLines.push(blip.statusLabel)
    if (blip.categoryTitle) tipLines.push(blip.categoryTitle)
    const c = getCommentMarkdown(blip).slice(0, 200)
    if (c) tipLines.push(c)
    const linkHref = normalizeLink(blip.infoUrl)
    if (linkHref) tipLines.push(linkHref)
    const titleText = tipLines.map(l => esc(l)).join('\n')

    if (linkHref) {
      svgParts.push(`  <a class="blip-link" href="${esc(linkHref)}" target="_blank" rel="noopener noreferrer">`)
    }
    svgParts.push(`  <g class="blip${linkHref ? ' blip--linked' : ''}" style="cursor:${linkHref ? 'pointer' : 'default'};">`)
    svgParts.push(`    <title>${titleText}</title>`)
    svgParts.push(`    <circle class="blip-circle" cx="${blip.x.toFixed(1)}" cy="${blip.y.toFixed(1)}" r="${BLIP_R}" fill="${blip.ringColor}" stroke="white" stroke-width="1.2"/>`)
    svgParts.push(`    <text x="${blip.x.toFixed(1)}" y="${blip.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="sans-serif" font-size="10" font-weight="700" style="pointer-events:none;user-select:none;">${blip.index}</text>`)
    svgParts.push('  </g>')
    if (linkHref) {
      svgParts.push('  </a>')
    }
  })
  svgParts.push('</svg>')
  const svgHtml = svgParts.join('\n')

  // ── Ring key ──────────────────────────────────────────────────────────
  const ringKeyHtml = RING_META
    .map((m, i) => ({ m, i }))
    .filter(({ i }) => visIdx.includes(i))
    .map(({ m }) => `<span class="rk-item"><span class="rk-dot" style="background:${m.color}"></span><span>${esc(m.label)}</span></span>`)
    .join('')

  // ── Legend ────────────────────────────────────────────────────────────
  function buildGroupsHtml (groups) {
    return groups.map(g => {
      const statusGroupsHtml = g.statusGroups.map(sg => {
        const rows = sg.blips.map(b => {
          const linkHref = normalizeLink(b.infoUrl)
          const infoLinkHtml = linkHref
            ? '<a class="legend-inline-link" href="' + esc(linkHref) + '" target="_blank" rel="noopener noreferrer" title="Open further information">↗</a>'
            : ''
          const tipParts = []
          if (b.statusLabel) tipParts.push('<span class="tt-row">' + esc(b.statusLabel) + '</span>')
          if (b.categoryTitle) tipParts.push('<span class="tt-row">' + esc(b.categoryTitle) + '</span>')
          const commentHtml = renderMarkdownComment(getCommentMarkdown(b))
          if (commentHtml) tipParts.push('<div class="tt-markdown">' + commentHtml + '</div>')
          if (linkHref) tipParts.push('<span class="tt-link"><a href="' + esc(linkHref) + '" target="_blank" rel="noopener noreferrer">Open further information</a></span>')
          const tipHtml = tipParts.length
            ? '<span class="legend-tip"><span class="tt-name">' + esc(b.name) + '</span>' + tipParts.join('') + '</span>'
            : ''
          return '<div class="legend-row">' +
            '<span class="legend-idx" style="background:' + b.ringColor + '">' + b.index + '</span>' +
            '<span class="legend-name-wrap"><span class="legend-name">' + esc(b.name) + '</span>' + infoLinkHtml + '</span>' +
            tipHtml +
            '</div>'
        }).join('')
        return '<div class="status-header" style="color:' + sg.color + '">' + esc(sg.statusLabel) + '</div>' + rows
      }).join('')
      const label = esc(g.label || ('Quadrant ' + (g.quadrant + 1)))
      return '<div class="q-group"><div class="q-header">' + label + '</div>' + statusGroupsHtml + '</div>'
    }).join('')
  }

  const leftBlipGroups = blipsByQuadrant
    .filter(g => g.quadrant === 1 || g.quadrant === 2)
    .sort((a, b) => a.quadrant - b.quadrant)
  const rightBlipGroups = blipsByQuadrant
    .filter(g => g.quadrant === 0 || g.quadrant === 3)
    .sort((a, b) => a.quadrant - b.quadrant)

  const legendLeftHtml = buildGroupsHtml(leftBlipGroups)
  const legendRightHtml = buildGroupsHtml(rightBlipGroups)

  // ── CSS ───────────────────────────────────────────────────────────────
  const cssRules = [
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;color:#1a1a1a;}',
    '.page{max-width:1400px;margin:0 auto;padding:24px 16px;}',
    'h1{font-size:20px;font-weight:600;margin-bottom:4px;}',
    '.subtitle{font-size:12px;color:rgba(0,0,0,.45);margin-bottom:20px;}',
    '.radar-layout{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;align-items:start;}',
    '@media(max-width:960px){.radar-layout{grid-template-columns:1fr;}}',
    '#radar-svg{width:100%;height:auto;max-width:100%;display:block;margin:0 auto;}',
    '.blip{cursor:pointer;}.blip:hover .blip-circle{stroke-width:2.5;filter:brightness(1.15);}',
    '.ring-key{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:12px;}',
    '.rk-item{display:flex;align-items:center;gap:6px;font-size:12px;}',
    '.rk-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;}',
    '.q-group{margin-bottom:16px;}',
    '.q-header{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(0,0,0,.45);padding:2px 6px;border-left:3px solid rgba(21,101,192,.5);margin-bottom:4px;}',
    '.status-header{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:4px 6px 2px;margin-top:2px;}',
    '.legend-row{display:flex;align-items:flex-start;gap:10px;padding:5px 6px;border-radius:6px;cursor:default;margin-bottom:2px;position:relative;transition:background .12s;}',
    '.legend-row:hover{background:rgba(0,0,0,.06);}',
    '.legend-idx{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;color:#fff;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px;}',
    '.legend-name-wrap{display:flex;align-items:center;gap:6px;min-width:0;}',
    '.legend-name{font-size:14px;font-weight:500;line-height:1.3;word-break:break-word;}',
    '.legend-inline-link{font-size:12px;color:#1565c0;text-decoration:none;flex-shrink:0;}',
    '.legend-inline-link:hover{text-decoration:underline;}',
    '.legend-tip{display:none;position:absolute;left:100%;top:0;margin-left:8px;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:6px;padding:10px 12px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.15);min-width:180px;max-width:260px;z-index:9999;white-space:normal;}',
    '.legend-row:hover .legend-tip{display:block;}',
    '.radar-legend{overflow:visible;}',
    '.legend-tip .tt-name{display:block;font-weight:600;font-size:13px;margin-bottom:4px;}',
    '.legend-tip .tt-row{display:block;color:rgba(0,0,0,.55);margin-bottom:2px;}',
    '.legend-tip .tt-markdown{display:block;color:rgba(0,0,0,.82);margin-top:6px;padding-top:6px;border-top:1px solid rgba(0,0,0,.08);word-break:break-word;}',
    '.legend-tip .tt-markdown > :first-child{margin-top:0;}',
    '.legend-tip .tt-markdown > :last-child{margin-bottom:0;}',
    '.legend-tip .tt-markdown p,.legend-tip .tt-markdown ul,.legend-tip .tt-markdown ol,.legend-tip .tt-markdown pre,.legend-tip .tt-markdown blockquote{margin:0 0 8px;}',
    '.legend-tip .tt-markdown ul,.legend-tip .tt-markdown ol{padding-left:18px;}',
    '.legend-tip .tt-markdown code{font-family:Consolas,"Courier New",monospace;background:rgba(0,0,0,.06);padding:1px 4px;border-radius:4px;}',
    '.legend-tip .tt-markdown pre{background:rgba(0,0,0,.06);padding:8px;border-radius:6px;overflow:auto;}',
    '.legend-tip .tt-markdown pre code{background:transparent;padding:0;}',
    '.legend-tip .tt-markdown blockquote{border-left:3px solid rgba(21,101,192,.35);padding-left:8px;color:rgba(0,0,0,.64);}',
    '.legend-tip .tt-markdown a{color:#1565c0;text-decoration:none;}',
    '.legend-tip .tt-markdown a:hover{text-decoration:underline;}',
    '.legend-tip .tt-link{display:block;margin-top:6px;padding-top:6px;border-top:1px solid rgba(0,0,0,.08);}',
    '.legend-tip .tt-link a{color:#1565c0;text-decoration:none;}',
    '.legend-tip .tt-link a:hover{text-decoration:underline;}'
  ]
  const css = cssRules.join('\n')

  // ── Assemble HTML ─────────────────────────────────────────────────────
  const exportedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const safeTitle = esc(title)

  const htmlParts = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8"/>',
    '  <meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '  <title>Tech Radar \u2013 ' + safeTitle + '</title>',
    '  <style>',
    css,
    '  </style>',
    '</head>',
    '<body>',
    '  <div class="page">',
    '    <h1>' + safeTitle + ' \u2013 Tech Radar</h1>',
    '    <p class="subtitle">Exported ' + exportedAt + ' &middot; ' + blips.length + ' blip' + (blips.length !== 1 ? 's' : '') + '</p>',
    '    <div class="radar-layout">',
    '      <div class="radar-legend">' + legendLeftHtml + '</div>',
    '      <div class="radar-center">',
    '        ' + svgHtml,
    '        <div class="ring-key">' + ringKeyHtml + '</div>',
    '      </div>',
    '      <div class="radar-legend">' + legendRightHtml + '</div>',
    '    </div>',
    '  </div>',
    '</body>',
    '</html>'
  ]

  const html = htmlParts.join('\n')
  const fileName = 'tech-radar-' + title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.html'
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = fileName
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

// ── Custom HTML export ────────────────────────────────────────────────────────

/** Build one blip card (shared by both grouping modes). */
function _blipCard (b, badgeColor, subLabel, displayOptions) {
  const { showBindingLevel = true, showBlipIndex = true, labels = {}, statusColors = {} } = displayOptions || {}
  const RING_LABELS_LC = RING_META.map(r => r.label.toLowerCase())
  const ringKey = RING_LABELS_LC[b.ring] || ''
  const resolvedColor = statusColors[ringKey] || badgeColor
  const recommendationText = labels.recommendation || 'Recommendation'
  const mandatoryText = labels.mandatory || 'Mandatory'
  const furtherInfoText = labels.furtherInfo || 'Further information'
  const commentHtml = renderMarkdownComment(getCommentMarkdown(b))
  const linkHref = normalizeLink(b.infoUrl)
  const isMandatory = showBindingLevel && b.mandatory
  const badgeContent = showBlipIndex ? b.index : ''
  const badgeStyle = 'background:' + resolvedColor + (isMandatory ? ';border-radius:3px;' : '')
  const bindingHtml = showBindingLevel
    ? '<span class="blip-binding' + (isMandatory ? ' blip-binding--mandatory' : '') + '">' +
      (isMandatory ? esc(mandatoryText) : esc(recommendationText)) + '</span>'
    : ''
  return '<div class="blip-card">' +
    '<div class="blip-card-header">' +
      '<span class="blip-badge" style="' + badgeStyle + '">' + badgeContent + '</span>' +
      '<div class="blip-card-meta">' +
        '<div class="blip-card-title-row">' +
          '<div class="blip-card-name">' + esc(b.name) + '</div>' +
          bindingHtml +
        '</div>' +
        '<div class="blip-card-cat">' + esc(subLabel || '') + '</div>' +
      '</div>' +
    '</div>' +
    (commentHtml ? '<div class="blip-card-comment">' + commentHtml + '</div>' : '') +
    (linkHref ? '<a class="blip-card-link-btn" href="' + esc(linkHref) + '" target="_blank" rel="noopener noreferrer">' + esc(furtherInfoText) + ' \u2197</a>' : '') +
    '</div>'
}

/**
 * Build the CSS-grid blip-card layout used in the custom export.
 * @param {Array}  blips        Filtered & re-indexed blips (each has .groupLabel)
 * @param {number} gridColumns  1–6
 * @param {string} groupBy      'status' | 'category'
 * @param {object} statusLabels Map: lowercase ring label → display name
 * @returns {{ html: string }}
 */
function _buildGridContent (blips, gridColumns, groupBy, statusLabels, displayOptions) {
  const cols = Math.max(1, Math.min(6, parseInt(gridColumns) || 3))
  const sl = statusLabels || {}
  const sc = (displayOptions && displayOptions.statusColors) || {}

  function slug (s) {
    return 'grp-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  let sectionsHtml = ''

  if (groupBy === 'category') {
    const order = [...new Set(blips.map(b => b.groupLabel || b.categoryTitle))]
    sectionsHtml = order.map(groupLabel => {
      const id = slug(groupLabel)
      const cards = blips
        .filter(b => (b.groupLabel || b.categoryTitle) === groupLabel)
        .slice()
        .sort((a, b) => a.ring !== b.ring ? a.ring - b.ring : a.mandatory !== b.mandatory ? (a.mandatory ? -1 : 1) : (a.name || '').localeCompare(b.name || ''))
        .map(b => {
          const meta = RING_META[b.ring] || { color: '#9e9e9e', label: '' }
          const ringKey = meta.label.toLowerCase()
          const color = sc[ringKey] || meta.color
          const statusDisplay = sl[ringKey] || meta.label
          return _blipCard(b, color, statusDisplay, displayOptions)
        }).join('')
      return '<section class="ring-section" id="' + id + '">' +
        '<div class="ring-section-header" style="border-color:#1565c0;color:#1565c0">' + esc(groupLabel) + '</div>' +
        '<div class="blip-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">' + cards + '</div>' +
        '</section>'
    }).join('')
  } else {
    const byRing = [0, 1, 2, 3, 4].map(ri => ({
      meta: RING_META[ri],
      blips: blips.filter(b => b.ring === ri)
    })).filter(r => r.blips.length > 0)

    sectionsHtml = byRing.map(({ meta, blips: ringBlips }) => {
      const id = slug(meta.label)
      const ringKey = meta.label.toLowerCase()
      const color = sc[ringKey] || meta.color
      const headerLabel = sl[ringKey] || meta.label
      const cards = ringBlips
        .slice()
        .sort((a, b) => a.mandatory !== b.mandatory ? (a.mandatory ? -1 : 1) : (a.name || '').localeCompare(b.name || ''))
        .map(b => _blipCard(b, color, b.groupLabel || b.categoryTitle || '', displayOptions)).join('')
      return '<section class="ring-section" id="' + id + '">' +
        '<div class="ring-section-header" style="border-color:' + color + ';color:' + color + '">' + esc(headerLabel) + '</div>' +
        '<div class="blip-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">' + cards + '</div>' +
        '</section>'
    }).join('')
  }

  return { html: sectionsHtml }
}

/**
 * Generate a custom-configured HTML string for the Tech Radar (list view, no SVG).
 * Always renders both groupings (by status + by category) with a pure-CSS toggle.
 * Returns the HTML string without triggering a download.
 *
 * @param {object}   params
 * @param {string}   params.title
 * @param {Array}    params.blips               positionedBlips (ring, ringColor, index, …)
 * @param {object}   options
 * @param {Array}    [options.categoryGroups]    [{categories:string[], label:string, included:boolean}] — new format
 * @param {string[]} [options.includedCategories] Category titles to include — legacy fallback
 * @param {object}   [options.statusLabels]      { adopt:'Adopt', … } — display names for status headers
 * @param {string[]} options.includedStatuses    Lowercase ring labels to include
 * @param {number}   options.gridColumns         Grid columns (1–6)
 * @param {boolean}  options.showGroupToggle     Include the By Status / By Category toggle
 * @param {boolean}  options.showSearch          Include a search input (requires JS in export)
 */
export function generateCustomRadarHtml (params, options) {
  const { title, blips } = params
  const {
    categoryGroups,
    includedCategories = [],
    statusLabels = {},
    includedStatuses = [],
    gridColumns = 3,
    showGroupToggle = true,
    showSearch = false,
    defaultGrouping = 'status',
    groupToggleLabels = {},
    showBindingLevel = true,
    showBlipIndex = true,
    labels = {},
    statusColors = {}
  } = options

  // Build category → group-label map from whichever format is provided
  const catToGroupLabel = {}
  if (categoryGroups && categoryGroups.length > 0) {
    for (const g of categoryGroups.filter(g => g.included !== false)) {
      for (const cat of g.categories) catToGroupLabel[cat] = g.label
    }
  } else {
    for (const cat of includedCategories) catToGroupLabel[cat] = cat
  }

  const statusSet = new Set(includedStatuses.map(s => s.toLowerCase()))

  // ── Filter blips & annotate with groupLabel + sequential index ──────────────
  let counter = 0
  const filteredBlips = blips.filter(b => {
    const sk = (RING_META[b.ring]?.label || '').toLowerCase()
    return (b.categoryTitle in catToGroupLabel) && statusSet.has(sk)
  }).map(b => ({ ...b, index: ++counter, groupLabel: catToGroupLabel[b.categoryTitle] }))

  // ── Both groupings ────────────────────────────────────────────────────────
  const displayOptions = { showBindingLevel, showBlipIndex, labels, statusColors }
  const { html: statusHtml } = _buildGridContent(filteredBlips, gridColumns, 'status', statusLabels, displayOptions)
  const { html: categoryHtml } = _buildGridContent(filteredBlips, gridColumns, 'category', statusLabels, displayOptions)

  // ── CSS ──────────────────────────────────────────────────────────────────
  const css = [
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;color:#1a1a1a;}',
    '.page{max-width:1400px;margin:0 auto;padding:24px 16px;}',
    // ── hidden radio controls ──
    ...(showGroupToggle ? [
      '#grp-status,#grp-category{position:absolute;opacity:0;pointer-events:none;}',
    ] : []),
    // ── toolbar (toggle) ──
    ...(showGroupToggle || showSearch ? [
      '.toolbar{display:flex;align-items:center;gap:12px;margin-bottom:24px;}',
    ] : []),
    ...(showSearch ? [
      '.search-input{flex:1;padding:9px 16px;font-size:14px;border:1px solid rgba(0,0,0,.2);border-radius:24px;outline:none;background:#fff;font-family:inherit;}',
      '.search-input:focus{border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12);}',
      '.blip-card.sh{display:none;}',
      '.ring-section.sh{display:none;}',
    ] : []),
    ...(showGroupToggle ? [
      '.view-toggle{display:flex;flex-shrink:0;border:1px solid rgba(0,0,0,.18);border-radius:20px;overflow:hidden;}',
      '.view-toggle label{padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;color:rgba(0,0,0,.55);white-space:nowrap;user-select:none;}',
      '.view-toggle label:hover{background:rgba(0,0,0,.04);}',
      '#grp-status:checked ~ .toolbar .view-toggle label[for="grp-status"]{background:#1565c0;color:#fff;}',
      '#grp-category:checked ~ .toolbar .view-toggle label[for="grp-category"]{background:#1565c0;color:#fff;}',
      // ── view visibility ──
      '.view-status{display:block;}',
      '.view-category{display:none;}',
      '#grp-category:checked ~ .view-status{display:none;}',
      '#grp-category:checked ~ .view-category{display:block;}',
    ] : []),
    '.ring-section{margin-bottom:40px;}',
    '.ring-section-header{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;border-left:4px solid;padding:4px 10px;margin-bottom:12px;}',
    '.blip-grid{display:grid;gap:12px;}',
    '.blip-card{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px;}',
    '.blip-card-header{display:flex;align-items:flex-start;gap:10px;}',
    '.blip-badge{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;border-radius:13px;color:#fff;font-size:12px;font-weight:700;flex-shrink:0;padding:0 6px;}',
    '.blip-card-meta{flex:1;min-width:0;}',
    '.blip-card-title-row{display:flex;align-items:baseline;gap:8px;}',
    '.blip-card-name{font-size:14px;font-weight:600;word-break:break-word;flex:1;min-width:0;}',
    '.blip-card-cat{font-size:11px;color:rgba(0,0,0,.45);margin-top:2px;}',
    '.blip-card-link-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:600;color:#1565c0;text-decoration:none;border:1px solid rgba(21,101,192,.4);border-radius:4px;align-self:flex-start;margin-top:4px;}',
    '.blip-card-link-btn:hover{background:rgba(21,101,192,.08);border-color:#1565c0;}',
    '.blip-binding{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:rgba(0,0,0,.38);white-space:nowrap;flex-shrink:0;}',
    '.blip-binding--mandatory{color:#c62828;}',
    '.blip-card-comment{font-size:13px;color:rgba(0,0,0,.7);border-top:1px solid rgba(0,0,0,.06);padding-top:8px;}',
    '.blip-card-comment>:first-child{margin-top:0;}.blip-card-comment>:last-child{margin-bottom:0;}',
    '.blip-card-comment p,.blip-card-comment ul,.blip-card-comment ol{margin:0 0 6px;}',
    '.blip-card-comment ul,.blip-card-comment ol{padding-left:18px;}',
    '.blip-card-comment code{font-family:Consolas,"Courier New",monospace;background:rgba(0,0,0,.06);padding:1px 4px;border-radius:3px;font-size:12px;}',
    '.blip-card-comment a{color:#1565c0;text-decoration:none;}.blip-card-comment a:hover{text-decoration:underline;}',
  ].join('\n')

  // ── Assemble document ────────────────────────────────────────────────────
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8"/>',
    '  <meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '  <title>' + esc(title) + ' \u2013 Tech Radar</title>',
    '  <style>' + css + '</style>',
    '</head>',
    '<body>',
    '  <div class="page">',
    ...(showGroupToggle ? [
      '    <input type="radio" name="grp" id="grp-status"' + (defaultGrouping !== 'category' ? ' checked' : '') + '>',
      '    <input type="radio" name="grp" id="grp-category"' + (defaultGrouping === 'category' ? ' checked' : '') + '>',
    ] : []),
    ...((showGroupToggle || showSearch) ? [
      '    <div class="toolbar">',
      ...(showSearch ? ['      <input id="si" class="search-input" type="search" placeholder="Search\u2026" autocomplete="off">'] : []),
      ...(showGroupToggle ? [
        '      <div class="view-toggle">',
        '        <label for="grp-status">' + esc(groupToggleLabels.status || 'By Status') + '</label>',
        '        <label for="grp-category">' + esc(groupToggleLabels.category || 'By Category') + '</label>',
        '      </div>',
      ] : []),
      '    </div>',
    ] : []),
    ...(showGroupToggle ? [
      '    <div class="view-status">' + statusHtml + '</div>',
      '    <div class="view-category">' + categoryHtml + '</div>',
    ] : [
      '    ' + (defaultGrouping === 'category' ? categoryHtml : statusHtml),
    ]),
    '  </div>',
    ...(showSearch ? [
      '  <script>',
      '  document.getElementById("si").addEventListener("input",function(){',
      '    var q=this.value.toLowerCase().trim();',
      '    document.querySelectorAll(".blip-card").forEach(function(c){',
      '      c.classList.toggle("sh",q.length>0&&!c.textContent.toLowerCase().includes(q));',
      '    });',
      '    document.querySelectorAll(".ring-section").forEach(function(s){',
      '      s.classList.toggle("sh",q.length>0&&s.querySelectorAll(".blip-card:not(.sh)").length===0);',
      '    });',
      '  });',
      '  <\/script>',
    ] : []),
    '</body>',
    '</html>',
  ].join('\n')
}

/**
 * Generate a custom HTML Tech Radar page and trigger a browser download.
 */
export function downloadCustomRadarHtml (params, options) {
  const html = generateCustomRadarHtml(params, options)
  const safeSlug = String(params.title || 'export').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'tech-radar-custom-' + safeSlug + '.html'
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
