// Export of a project comparison, as JSON and as a standalone HTML document.
// Follows the pattern of techRadarExport.js: plain JS, no Vue, so HTML tag
// strings are safe here.
//
// A report that leaves the tool must carry its own uncertainty with it: every
// unresolved name is marked, and the summary states how much of the vocabulary
// was resolved (Todo 6.3). Without that a reader cannot tell a real divergence
// from two spellings of the same thing.

const COVERAGE_LABELS = { all: '◉ all', partial: '◐ partial', unique: '◑ unique' }
const DELTA_LABELS = {
  none: '—',
  match: '✓ match',
  minor: '▲ minor',
  significant: '▲▲ significant',
  critical: '▲▲▲ critical',
  inconsistent: '⚠ inconsistent',
  unset: '⊘ unset',
  accepted: '✎ accepted'
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
      otherReasons: row.reasons.filter((reason) => reason !== row.delta),
      override: row.override ? { ...row.override, needsReview: Boolean(row.overrideStale) } : null,
      projects: projectIds.map((projectId) => ({
        projectId,
        values: (row.cells.get(projectId)?.values || []).map((value) => ({
          status: value.status,
          entryTitle: value.origin.entryTitle,
          categoryTitle: value.origin.categoryTitle,
          rawName: value.origin.rawName
        }))
      }))
    })),
    overrides: workspace?.comparisonOverrides || {}
  }
}

/** A standalone HTML report of the same content. */
export function buildComparisonHtml(exportData) {
  const { selection, metrics, terms } = exportData
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
    '.footnote{font-size:11px;color:rgba(0,0,0,.5);margin-top:16px;}'
  ].join('\n')

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
