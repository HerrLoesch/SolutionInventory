// Tech Radar standalone HTML export utility.
// Plain JS module – no Vue SFC parser involved, so HTML tag strings are safe.

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
    svgParts.push(`  <g class="blip" data-key="${esc(blip.key)}" style="cursor:pointer;">`)
    svgParts.push(`    <circle class="blip-circle" cx="${blip.x.toFixed(1)}" cy="${blip.y.toFixed(1)}" r="${BLIP_R}" fill="${blip.ringColor}" stroke="white" stroke-width="1.2"/>`)
    svgParts.push(`    <text x="${blip.x.toFixed(1)}" y="${blip.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="sans-serif" font-size="10" font-weight="700" style="pointer-events:none;user-select:none;">${blip.index}</text>`)
    svgParts.push('  </g>')
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
          return '<div class="legend-row" data-key="' + esc(b.key) + '">' +
            '<span class="legend-idx" style="background:' + b.ringColor + '">' + b.index + '</span>' +
            '<span class="legend-name">' + esc(b.name) + '</span>' +
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

  // ── Blip data for runtime tooltip ────────────────────────────────────
  const blipDataJson = JSON.stringify(blips.map(b => ({
    key: b.key,
    name: b.name,
    categoryTitle: b.categoryTitle || '',
    statusLabel: b.statusLabel || '',
    typeLabel: b.typeLabel || '',
    questionnaireName: b.questionnaireName || '',
    comment: (b.shortComment || b.comment || '').slice(0, 200),
    ringColor: b.ringColor
  })))

  // ── Inline tooltip script (split </script> to avoid parser issues) ────
  // Written as string concatenation so bundlers never see </script> literally.
  const scriptOpen = '<' + 'script>'
  const scriptClose = '<' + '/script>'
  const inlineJs = [
    '(function(){',
    '  var DATA=' + blipDataJson + ';',
    '  var MAP=new Map(DATA.map(function(b){return[b.key,b];}));',
    '  var tt=document.getElementById(\'tt\');',
    '  var cur=null;',
    '  function esc(s){var t=String(s||\'\');t=t.replace(/&/g,\'&amp;\');t=t.split(\'<\').join(\'&lt;\');t=t.split(\'>\').join(\'&gt;\');return t;}',
    '  function showTip(b,e){',
    '    tt.innerHTML=\'<div class="tt-name">\'+esc(b.name)+\'</div>\'',
    '      +\'<div class="tt-row">\'+esc(b.statusLabel)+(b.typeLabel?\' \u00b7 \'+esc(b.typeLabel):\'\')+\'</div>\'',
    '      +(b.categoryTitle?\'<div class="tt-row">\'+esc(b.categoryTitle)+\'</div>\':\'\')',
    '      +(b.questionnaireName?\'<div class="tt-row">\'+esc(b.questionnaireName)+\'</div>\':\'\')',
    '      +(b.comment?\'<div class="tt-comment">\'+esc(b.comment)+\'</div>\':\'\')',
    '    ;moveTip(e);tt.classList.add(\'on\');',
    '  }',
    '  function moveTip(e){',
    '    var x=e.clientX+14,y=e.clientY-10;',
    '    if(x+270>window.innerWidth)x=e.clientX-274;',
    '    if(y+180>window.innerHeight)y=window.innerHeight-185;',
    '    tt.style.left=x+\'px\';tt.style.top=y+\'px\';',
    '  }',
    '  function setHover(key){',
    '    if(cur===key)return;cur=key;',
    '    document.querySelectorAll(\'.blip\').forEach(function(el){',
    '      var k=el.dataset.key;',
    '      el.classList.toggle(\'hovered\',k===key);',
    '      el.classList.toggle(\'dimmed\',key!=null&&k!==key);',
    '    });',
    '    document.querySelectorAll(\'.legend-row\').forEach(function(el){',
    '      var k=el.dataset.key;',
    '      el.classList.toggle(\'hovered\',k===key);',
    '      el.classList.toggle(\'dimmed\',key!=null&&k!==key);',
    '    });',
    '  }',
    '  function clearHover(){',
    '    cur=null;',
    '    document.querySelectorAll(\'.blip,.legend-row\').forEach(function(el){el.classList.remove(\'hovered\',\'dimmed\');});',
    '    tt.classList.remove(\'on\');',
    '  }',
    '  document.querySelectorAll(\'#radar-svg .blip\').forEach(function(el){',
    '    var key=el.dataset.key,b=MAP.get(key);',
    '    el.addEventListener(\'mouseenter\',function(e){setHover(key);if(b)showTip(b,e);});',
    '    el.addEventListener(\'mousemove\',function(e){if(b)moveTip(e);});',
    '    el.addEventListener(\'mouseleave\',clearHover);',
    '  });',
    '  document.querySelectorAll(\'.legend-row\').forEach(function(el){',
    '    var key=el.dataset.key,b=MAP.get(key);',
    '    el.addEventListener(\'mouseenter\',function(e){setHover(key);if(b)showTip(b,e);});',
    '    el.addEventListener(\'mousemove\',function(e){if(b)moveTip(e);});',
    '    el.addEventListener(\'mouseleave\',clearHover);',
    '  });',
    '})();'
  ].join('\n')

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
    '.blip{cursor:pointer;}.blip.dimmed{opacity:.12;}.blip.hovered .blip-circle{stroke-width:2.5;}',
    '.ring-key{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:12px;}',
    '.rk-item{display:flex;align-items:center;gap:6px;font-size:12px;}',
    '.rk-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;}',
    '.q-group{margin-bottom:16px;}',
    '.q-header{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(0,0,0,.45);padding:2px 6px;border-left:3px solid rgba(21,101,192,.5);margin-bottom:4px;}',
    '.status-header{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:4px 6px 2px;margin-top:2px;}',
    '.legend-row{display:flex;align-items:flex-start;gap:10px;padding:5px 6px;border-radius:6px;cursor:pointer;margin-bottom:2px;transition:background .12s;}',
    '.legend-row:hover,.legend-row.hovered{background:rgba(0,0,0,.06);}.legend-row.dimmed{opacity:.25;}',
    '.legend-idx{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;color:#fff;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px;}',
    '.legend-name{font-size:14px;font-weight:500;line-height:1.3;word-break:break-word;}',
    '#tt{position:fixed;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:6px;padding:10px 12px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none;opacity:0;transition:opacity .1s;min-width:180px;max-width:260px;z-index:9999;}',
    '#tt.on{opacity:1;}',
    '#tt .tt-name{font-weight:600;font-size:13px;margin-bottom:4px;}',
    '#tt .tt-row{color:rgba(0,0,0,.55);margin-bottom:2px;}',
    '#tt .tt-comment{color:rgba(0,0,0,.75);font-style:italic;margin-top:6px;border-top:1px solid rgba(0,0,0,.08);padding-top:6px;white-space:pre-wrap;word-break:break-word;}'
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
    '  <div id="tt"></div>',
    '  ' + scriptOpen,
    inlineJs,
    '  ' + scriptClose,
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
