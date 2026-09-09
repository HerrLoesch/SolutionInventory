// Export of a project comparison, as JSON and as a standalone HTML document.
// Follows the pattern of techRadarExport.js: plain JS, no Vue, so HTML tag
// strings are safe here.
//
// A report that leaves the tool must carry its own uncertainty with it: every
// unresolved name is marked, and the summary states how much of the vocabulary
// was resolved (Todo 6.3). Without that a reader cannot tell a real divergence
// from two spellings of the same thing.

import { canonicalStatus } from '../services/comparison'

const COVERAGE_LABELS = { all: '◉ all', partial: '◐ partial', unique: '◑ unique' }
const DELTA_LABELS = {
  none: '—',
  match: '✓ match',
  minor: '▲ minor',
  significant: '▲▲ significant',
  critical: '▲▲▲ critical',
  inconsistent: '⚠ inconsistent',
  unset: '⊘ unset',
  accepted: '✎ accepted',
  silent: '≈ silently accepted',
  unlisted: '⊙ not in the reference',
  missing: '⊖ in the reference, unused'
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function projectNameOf(projects, projectId) {
  return projects.find((project) => project.id === projectId)?.name || projectId
}

/**
 * The comparison as a plain data document: the selection it was taken under,
 * the metrics, one entry per term and the overrides in force.
 *
 * `unresolved` is carried per term *and* summarized in `vocabulary`, so a
 * consumer cannot read the figures without also seeing how dependable they are.
 */
export function buildComparisonExport({
  workspace,
  projects,
  projectIds,
  rows,
  metrics,
  dataSource,
  visibleKinds,
  overlay = null,
  ignoredRows = [],
  baseline = null,
  baselineAgreement = null,
  pairwiseDivergence = [],
  exportedAt = new Date().toISOString()
}) {
  return {
    format: 'solution-inventory-comparison',
    formatVersion: 1,
    exportedAt,
    selection: {
      dataSource,
      kinds: [...visibleKinds],
      projects: projectIds.map((projectId) => ({ id: projectId, name: projectNameOf(projects, projectId) }))
    },
    metrics,
    // Who is apart from whom, not just that the workspace is. Each entry
    // carries the number of rows behind its percentage (F8).
    pairwiseDivergence,
    // The reference travels whole, not just its name. A report that says a
    // project follows the target 62 % of the time is unreadable without the
    // target itself (F7).
    baseline: baseline
      ? {
          name: baseline.name,
          origin: baseline.origin || {},
          entries: baseline.entries || {},
          agreement: baselineAgreement || {}
        }
      : null,
    terms: rows.map((row) => ({
      name: row.name,
      termId: row.term?.id || null,
      // The single most important qualifier on a row: was this a term or just a
      // piece of text that happened to match?
      unresolved: !row.resolved,
      possibleFalseDifference: Boolean(row.possibleFalseDifference),
      kind: row.kind,
      coverage: row.coverage,
      delta: row.delta,
      distance: row.distance,
      baselineStatus: row.baselineStatus || '',
      otherReasons: row.reasons.filter((reason) => reason !== row.delta),
      override: row.override ? { ...row.override, needsReview: Boolean(row.overrideStale) } : null,
      projects: projectIds.map((projectId) => ({
        projectId,
        // What this project silently accepted, if anything. `applies` is the
        // difference between a decision in force and one the data has moved
        // past — a reader must be able to tell the two apart (F3).
        acceptance: row.acceptances?.[projectId]
          ? {
              ...row.acceptances[projectId],
              applies: Boolean(row.appliedAcceptances?.get?.(projectId)),
              needsReview: Boolean(row.staleAcceptances?.includes(projectId))
            }
          : null,
        values: (row.cells.get(projectId)?.values || []).map((value) => ({
          // The canonical spelling for reading, the stored one for tracing the
          // value back into the project data (design F4).
          status: canonicalStatus(value.status),
          rawStatus: value.status,
          entryTitle: value.origin.entryTitle,
          categoryTitle: value.origin.categoryTitle,
          rawName: value.origin.rawName
        }))
      }))
    })),
    // Terms taken out of the comparison by hand. They are in none of the
    // figures above, so the report has to name them: an agreement produced by
    // leaving things out must say what was left out (F1).
    ignored: ignoredRows.map((row) => ({
      name: row.name,
      termId: row.term?.id || null,
      unresolved: !row.resolved,
      reason: row.ignored?.reason || '',
      setAt: row.ignored?.setAt || ''
    })),
    // The overlay travels as finished chart data — coordinates, colours and
    // symbol paths. The view already computed all of it, and a report that had
    // to lay the chart out a second time would be a second chance to disagree
    // with the screen it came from.
    overlay,
    overrides: workspace?.comparisonOverrides || {}
  }
}

/** The radar overlay as inline SVG, so the report carries the picture too. */
function overlaySection(overlay) {
  if (!overlay || !Array.isArray(overlay.points)) return []

  const rings = overlay.rings
    .map(
      (ring) =>
        '<circle cx="' +
        overlay.center +
        '" cy="' +
        overlay.center +
        '" r="' +
        ring.outer +
        '" fill="none" stroke="rgba(0,0,0,.15)"/>' +
        '<text x="' +
        overlay.center +
        '" y="' +
        ring.labelY +
        '" text-anchor="middle" dominant-baseline="middle" class="ring" fill="' +
        esc(ring.color) +
        '">' +
        esc(ring.label) +
        '</text>'
    )
    .join('')

  const axes =
    '<line x1="' +
    overlay.center +
    '" y1="' +
    (overlay.center - overlay.radius) +
    '" x2="' +
    overlay.center +
    '" y2="' +
    (overlay.center + overlay.radius) +
    '" stroke="rgba(0,0,0,.15)"/>' +
    '<line x1="' +
    (overlay.center - overlay.radius) +
    '" y1="' +
    overlay.center +
    '" x2="' +
    (overlay.center + overlay.radius) +
    '" y2="' +
    overlay.center +
    '" stroke="rgba(0,0,0,.15)"/>'

  const quadrants = overlay.quadrants
    .filter((quadrant) => quadrant.label)
    .map(
      (quadrant) =>
        '<text x="' +
        quadrant.x +
        '" y="' +
        quadrant.y +
        '" text-anchor="' +
        esc(quadrant.anchor) +
        '" class="quadrant">' +
        esc(quadrant.label) +
        '</text>'
    )
    .join('')

  const segments = overlay.segments
    .map(
      (segment) =>
        '<line x1="' +
        segment.x1 +
        '" y1="' +
        segment.y1 +
        '" x2="' +
        segment.x2 +
        '" y2="' +
        segment.y2 +
        '" stroke="' +
        (segment.kind === 'internal' ? '#ef6c00' : '#c62828') +
        '" stroke-width="1.5"/>'
    )
    .join('')

  const points = overlay.points
    .map(
      (point) =>
        '<path d="' +
        esc(point.path) +
        '" fill="' +
        esc(point.color) +
        '"' +
        (point.unresolved ? ' stroke="#333" stroke-dasharray="2 2"' : '') +
        (point.unassignedKind ? ' opacity="0.45"' : '') +
        '><title>' +
        esc(point.name + ' — ' + point.project + ' — ' + point.status) +
        '</title></path>'
    )
    .join('')

  const legend = overlay.projects
    .map(
      (project) =>
        '<span class="legend-item"><svg width="14" height="14" viewBox="0 0 14 14"><path d="' +
        esc(project.path) +
        '" fill="' +
        esc(project.color) +
        '"/></svg>' +
        esc(project.name) +
        (project.hidden ? ' (hidden)' : '') +
        '</span>'
    )
    .join('')

  return [
    '<h2>Radar overlay</h2>',
    '<p class="subtitle">Rings are the status, quadrants the categories of ' +
      esc(overlay.referenceProject || 'the reference project') +
      '. A line joins takes at least two rings apart.</p>',
    '<svg viewBox="0 0 ' + overlay.size + ' ' + overlay.size + '" class="overlay">',
    rings + axes + quadrants + segments + points,
    '</svg>',
    '<div class="legend">' + legend + '</div>',
    overlay.withoutStatus.length
      ? '<p class="footnote">⊘ Without status, not plotted: ' + esc(overlay.withoutStatus.join(', ')) + '</p>'
      : ''
  ].filter(Boolean)
}

/** A standalone HTML report of the same content. */
export function buildComparisonHtml(exportData) {
  const {
    selection,
    metrics,
    terms,
    overlay,
    ignored = [],
    baseline = null,
    pairwiseDivergence = []
  } = exportData
  const projectNames = selection.projects.map((project) => project.name)

  const header = [
    '<h1>Project comparison</h1>',
    '<p class="subtitle">' +
      esc(projectNames.join(' · ')) +
      ' &middot; data source: ' +
      esc(selection.dataSource) +
      ' &middot; kinds: ' +
      esc(selection.kinds.join(', ')) +
      '</p>'
  ]

  const summary = [
    '<div class="summary">',
    '<div><strong>Vocabulary coverage</strong> ' +
      metrics.vocabulary.percent +
      ' % &middot; ◌ ' +
      metrics.vocabulary.unresolved +
      ' unresolved names</div>',
    '<div><strong>Terms</strong> ' +
      metrics.total +
      ' &middot; ◉ ' +
      metrics.all +
      ' &middot; ◐ ' +
      metrics.partial +
      ' &middot; ◑ ' +
      metrics.unique +
      (metrics.ignored ? ' &middot; ⃠ ' + metrics.ignored + ' not important (excluded from every figure)' : '') +
      '</div>',
    '<div><strong>Compared</strong> ' +
      metrics.compared +
      ' &minus; <strong>Excluded</strong> ' +
      metrics.excluded +
      ' (⊘ ' +
      metrics.unset +
      ' · ⚠ ' +
      metrics.inconsistent +
      ' · ✎ ' +
      metrics.accepted +
      ') = <strong>Comparable</strong> ' +
      metrics.comparable +
      '</div>',
    '<div>✓ ' +
      metrics.matches +
      (metrics.silent ? ' (≈ ' + metrics.silent + ' silently accepted)' : '') +
      ' &middot; ▲ ' +
      metrics.minor +
      ' &middot; ▲▲ ' +
      metrics.significant +
      ' &middot; ▲▲▲ ' +
      metrics.critical +
      '</div>',
    '<div><strong>Agreement</strong> ' + metrics.agreementPercent + ' % (' + esc(metrics.agreementLevel) + ')</div>',
    '</div>'
  ]

  const head =
    '<tr><th>Term</th>' +
    (baseline ? '<th>&#9678; Reference</th>' : '') +
    selection.projects.map((project) => '<th>' + esc(project.name) + '</th>').join('') +
    '<th>Coverage</th><th>&Delta; Status</th></tr>'

  const body = terms
    .map((term) => {
      const cells = term.projects
        .map((cell) =>
          cell.values.length
            ? '<td>' +
              cell.values
                .map(
                  (value) =>
                    esc(value.status || '⊘ unset') +
                    (cell.values.length > 1 ? ' <span class="origin">↳' + esc(value.entryTitle) + '</span>' : '')
                )
                .join('<br/>') +
              '</td>'
            : '<td class="empty">—</td>'
        )
        .join('')
      const marker =
        (term.unresolved ? '<span class="unresolved" title="Not in the vocabulary">◌</span> ' : '') +
        (term.possibleFalseDifference ? '<span class="unresolved" title="Possible false difference">⁉</span> ' : '')
      const override = term.override
        ? '<div class="override">✎ ' +
          esc(term.override.level) +
          (term.override.comment ? ' — ' + esc(term.override.comment) : '') +
          (term.override.needsReview ? ' <em>(context has changed)</em>' : '') +
          '</div>'
        : ''
      return (
        '<tr><td>' +
        marker +
        esc(term.name) +
        '</td>' +
        (baseline ? '<td class="baseline">' + esc(term.baselineStatus || '—') + '</td>' : '') +
        cells +
        '<td>' +
        esc(COVERAGE_LABELS[term.coverage] || term.coverage) +
        '</td><td>' +
        esc(DELTA_LABELS[term.delta] || term.delta) +
        override +
        '</td></tr>'
      )
    })
    .join('')

  const css = [
    'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:24px;color:#222;}',
    'h1{font-size:20px;margin:0 0 4px;}',
    '.subtitle{font-size:12px;color:rgba(0,0,0,.5);margin:0 0 16px;}',
    '.summary{display:flex;flex-wrap:wrap;gap:20px;font-size:13px;margin-bottom:20px;}',
    'table{border-collapse:collapse;width:100%;font-size:13px;}',
    'th,td{text-align:left;padding:4px 8px;border-bottom:1px solid rgba(0,0,0,.1);vertical-align:top;}',
    '.empty{color:rgba(0,0,0,.35);}',
    '.origin{color:rgba(0,0,0,.45);font-size:11px;}',
    '.unresolved{color:#ef6c00;font-weight:700;}',
    '.override{font-size:11px;color:rgba(0,0,0,.55);}',
    '.footnote{font-size:11px;color:rgba(0,0,0,.5);margin-top:16px;}',
    'h2{font-size:15px;margin:24px 0 4px;}',
    '.overlay{width:100%;max-width:460px;display:block;}',
    '.overlay .ring{font-size:9px;font-weight:600;text-transform:uppercase;}',
    '.overlay .quadrant{font-size:11px;font-weight:600;fill:rgba(0,0,0,.55);}',
    '.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;margin-top:6px;}',
    '.legend-item{display:inline-flex;align-items:center;gap:4px;}',
    '.ignored{font-size:12px;color:rgba(0,0,0,.6);margin:0;padding-left:18px;}',
    '.baseline{background:rgba(21,101,192,.06);}',
    '.bar-row{display:flex;align-items:center;gap:8px;font-size:13px;margin-top:4px;}',
    '.bar-label{min-width:180px;}',
    '.bar-track{flex:1 1 120px;max-width:260px;height:6px;border-radius:3px;background:rgba(0,0,0,.1);overflow:hidden;}',
    '.bar-fill{display:block;height:100%;}'
  ].join('\n')

  // The terms nobody wanted compared, named rather than silently missing.
  const ignoredSection = ignored.length
    ? [
        '<h2>⃠ Not important</h2>',
        '<p class="subtitle">Taken out of the comparison by hand. None of the figures above include them.</p>',
        '<ul class="ignored">' +
          ignored
            .map(
              (term) =>
                '<li>' +
                (term.unresolved ? '<span class="unresolved">◌</span> ' : '') +
                esc(term.name) +
                (term.reason ? ' — ' + esc(term.reason) : '') +
                '</li>'
            )
            .join('') +
          '</ul>'
      ]
    : []

  // Bars as plain markup: a report that has to fetch a chart library is a
  // report that shows nothing on a machine without a network.
  function barRow(label, percent, comparedRows, colour) {
    return (
      '<div class="bar-row"><span class="bar-label">' +
      esc(label) +
      '</span><span class="bar-track"><span class="bar-fill" style="width:' +
      Math.max(0, Math.min(100, percent)) +
      '%;background:' +
      colour +
      '"></span></span><strong>' +
      percent +
      ' %</strong><span class="origin">over ' +
      comparedRows +
      (comparedRows === 1 ? ' term' : ' terms') +
      '</span></div>'
    )
  }

  function barColour(goodPercent) {
    if (goodPercent >= 85) return '#2e7d32'
    return goodPercent >= 65 ? '#ef6c00' : '#c62828'
  }

  const divergenceSection = pairwiseDivergence.filter((pair) => pair.comparedRows > 0).length
    ? [
        '<h2>How far apart the projects are</h2>',
        pairwiseDivergence
          .filter((pair) => pair.comparedRows > 0)
          .slice()
          .sort((first, second) => second.percent - first.percent)
          .map((pair) =>
            barRow(
              projectNameOf(selection.projects, pair.a) + ' ↔ ' + projectNameOf(selection.projects, pair.b),
              pair.percent,
              pair.comparedRows,
              barColour(100 - pair.percent)
            )
          )
          .join('')
      ]
    : []

  // How closely each project follows the reference — the figure the reference
  // exists for, and one the peer agreement cannot stand in for.
  const baselineSection =
    baseline && Object.keys(baseline.agreement || {}).length
      ? [
          '<h2>&#9678; ' + esc(baseline.name) + '</h2>',
          '<p class="subtitle">' +
            Object.keys(baseline.entries || {}).length +
            ' terms &middot; ' +
            (baseline.origin && baseline.origin.kind === 'consensus'
              ? 'taken from the consensus'
              : 'taken from one project') +
            '</p>',
          selection.projects
            .map((project) => {
              const agreement = baseline.agreement[project.id] || { percent: 0, comparedRows: 0 }
              return barRow(project.name, agreement.percent, agreement.comparedRows, barColour(agreement.percent))
            })
            .join('')
        ]
      : []

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8"/>',
    '  <meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '  <title>Project comparison</title>',
    '  <style>',
    css,
    '  </style>',
    '</head>',
    '<body>',
    header.join('\n'),
    summary.join('\n'),
    '<table><thead>' + head + '</thead><tbody>' + body + '</tbody></table>',
    '<p class="footnote">◌ marks a name the vocabulary does not resolve; such rows match on exact text only. ⁉ marks a possible false difference.</p>',
    divergenceSection.join('\n'),
    baselineSection.join('\n'),
    ignoredSection.join('\n'),
    overlaySection(overlay).join('\n'),
    '</body>',
    '</html>'
  ].join('\n')
}

/** File name for either export, derived from the projects compared. */
export function comparisonFileName(projectNames, extension) {
  const slug =
    projectNames
      .join('-')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'workspace'
  return `comparison-${slug}.${extension}`
}

/** Hands a blob to the browser, the same way techRadarExport.js does. */
function download(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = fileName
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
  return fileName
}

export function downloadComparisonJson(exportData) {
  const names = exportData.selection.projects.map((project) => project.name)
  return download(
    JSON.stringify(exportData, null, 2),
    comparisonFileName(names, 'json'),
    'application/json; charset=utf-8'
  )
}

export function downloadComparisonHtml(exportData) {
  const names = exportData.selection.projects.map((project) => project.name)
  return download(buildComparisonHtml(exportData), comparisonFileName(names, 'html'), 'text/html; charset=utf-8')
}
