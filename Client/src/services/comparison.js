// The comparison engine: everything the Comparison tab shows, as pure functions.
// No Vue, no Pinia — the view renders what this returns and computes nothing of
// its own (plan §5).
//
// The pipeline, in the order the steps depend on each other:
//
//   collectUnits()  project data  ->  one flat shape, whichever source is used
//   buildRows()     units         ->  one row per term
//   ...
//
// Everything downstream of collectUnits knows only that flat shape and never
// sees `radar[]` or `answers[]` again. Otherwise the source distinction would
// travel through the whole engine (design §4.3).

import { buildEntryLookup, deriveBlipJoin, deriveKind } from './blipJoin'
import { normalize, findSimilarTerms } from './vocabulary'

export const DATA_SOURCES = ['radar', 'answers']

/**
 * One thing a project says about one name — the single shape the rest of the
 * engine works on.
 *
 *   Source    Unit                          Key                                     Raw name     Status
 *   radar     a blip from project.radar[]   (entryId, option)                       option       effectiveStatus
 *   answers   an answer from a questionnaire (questionnaireId, entryId, technology)  technology   answer.status
 *
 * `origin` keeps the entry and the raw spelling so a project cell can show where
 * a value came from. It is provenance only and never enters matching or the
 * metrics (DE-1).
 */
function makeUnit({ projectId, key, rawName, status, kind, entryId, entryTitle, categoryTitle, questionnaireName }) {
  return {
    projectId,
    key,
    rawName,
    status: String(status || '').trim(),
    kind,
    origin: {
      entryId: entryId || '',
      entryTitle: entryTitle || '',
      categoryTitle: categoryTitle || '',
      questionnaireName: questionnaireName || '',
      rawName
    }
  }
}

function projectQuestionnaires(workspace, project) {
  const ids = new Set(project?.questionnaireIds || [])
  return (workspace?.questionnaires || []).filter((questionnaire) => ids.has(questionnaire.id))
}

/**
 * Radar mode: one unit per curated blip. Status is the *effective* one, so a
 * blip that inherits its status from the answer counts as assessed (DE-7).
 */
function collectRadarUnits(workspace, project, aliasIndex) {
  const lookup = buildEntryLookup(projectQuestionnaires(workspace, project))
  const entries = Array.isArray(project?.radar) ? project.radar : []

  return entries
    .map((entry) => {
      const rawName = String(entry?.option || '').trim()
      if (!rawName) return null
      const joined = deriveBlipJoin(entry, lookup)
      return makeUnit({
        projectId: project.id,
        key: `${entry.entryId}||${rawName}`,
        rawName,
        status: joined.effectiveStatus,
        kind: deriveKind(rawName, joined.answerType, aliasIndex),
        entryId: entry.entryId,
        entryTitle: joined.entryTitle,
        categoryTitle: joined.effectiveCategory,
        questionnaireName: joined.questionnaireName
      })
    })
    .filter(Boolean)
}

/**
 * Answers mode: one unit per questionnaire answer, curated or not. The category
 * is the entry's natural one from the catalog — the same source TechRadar.vue
 * already falls back to. Yields more terms than radar mode by construction, and
 * DE-3 applies across questionnaires as well as within one.
 */
function collectAnswerUnits(workspace, project, aliasIndex) {
  const units = []
  for (const questionnaire of projectQuestionnaires(workspace, project)) {
    for (const category of questionnaire?.categories || []) {
      if (category?.isMetadata) continue
      const categoryTitle = String(category?.title || '').trim()
      for (const entry of category?.entries || []) {
        const entryId = String(entry?.id || '').trim()
        if (!entryId) continue
        const entryTitle = String(entry?.aspect || entry?.title || entryId).trim()
        for (const answer of entry?.answers || []) {
          const rawName = String(answer?.technology || '').trim()
          if (!rawName) continue
          units.push(
            makeUnit({
              projectId: project.id,
              key: `${questionnaire.id}||${entryId}||${rawName}`,
              rawName,
              status: answer?.status,
              kind: deriveKind(rawName, answer?.answerType, aliasIndex),
              entryId,
              entryTitle,
              categoryTitle,
              questionnaireName: questionnaire.name || questionnaire.id
            })
          )
        }
      }
    }
  }
  return units
}

/**
 * All comparison units for the selected projects, in the chosen source.
 * An unknown source falls back to 'radar' — the default the UI ships with.
 */
export function collectUnits(workspace, projectIds, { source = 'radar', aliasIndex = null } = {}) {
  const selected = new Set(projectIds || [])
  const projects = (workspace?.projects || []).filter((project) => selected.has(project.id))
  const collect = source === 'answers' ? collectAnswerUnits : collectRadarUnits
  return projects.flatMap((project) => collect(workspace, project, aliasIndex))
}

/**
 * The comparison key of a raw name: the term id when the vocabulary resolves it,
 * otherwise the normalized raw text (DE-2). Falling back to exact normalized
 * text means the comparison is never *worse* than it would be without a
 * vocabulary — it just shows its uncertainty.
 */
export function comparisonKeyOf(rawName, aliasIndex) {
  const normalized = normalize(rawName)
  const term = aliasIndex instanceof Map ? aliasIndex.get(normalized) : null
  return term ? { key: `term:${term.id}`, term } : { key: `raw:${normalized}`, term: null }
}

/**
 * Condenses units into one row per term. A row is the unit of the comparison
 * view: terms, not catalog entries, because different projects use different
 * catalogs and may file the same term under different categories (DE-1).
 *
 * Each row carries a cell per project. A cell holds *all* of that project's
 * takes on the term — a project can rate the same term twice under two entries,
 * and that case is not defined away but surfaced (DE-3).
 *
 * @returns {Array<{
 *   key: string, term: object|null, name: string, resolved: boolean, kind: string,
 *   cells: Map<string, { projectId, values: Array<{ status, origin }> }>
 * }>}
 */
export function buildRows(units, aliasIndex) {
  const rows = new Map()

  for (const unit of units || []) {
    const { key, term } = comparisonKeyOf(unit.rawName, aliasIndex)
    if (key === 'raw:') continue

    if (!rows.has(key)) {
      rows.set(key, {
        key,
        term,
        // The canonical name for a resolved term, the first raw spelling seen
        // otherwise — an unresolved row is carried under its own text, marked,
        // and never dropped (DE-2).
        name: term ? term.name : unit.rawName,
        resolved: Boolean(term),
        kind: unit.kind,
        cells: new Map()
      })
    }
    const row = rows.get(key)
    // A row's kind is 'unassigned' only if nothing that landed in it knew better.
    if (row.kind === 'unassigned' && unit.kind !== 'unassigned') row.kind = unit.kind

    if (!row.cells.has(unit.projectId)) {
      row.cells.set(unit.projectId, { projectId: unit.projectId, values: [] })
    }
    row.cells.get(unit.projectId).values.push({ status: unit.status, origin: unit.origin })
  }

  return [...rows.values()]
}

/**
 * Whether a project rates a term inconsistently with itself: two takes on the
 * same term that disagree on status (DE-3). Two takes that *agree* are merely a
 * duplicate entry, not a contradiction, and must not be reported as one.
 */
export function isCellInconsistent(cell) {
  const statuses = new Set((cell?.values || []).map((value) => normalize(value.status)))
  return statuses.size > 1
}

export const COVERAGE = { ALL: 'all', PARTIAL: 'partial', UNIQUE: 'unique' }

/**
 * How many of the selected projects use a term (DE-6). Coverage and divergence
 * are independent questions and get their own column each: how *many* projects
 * use something says nothing about how much they agree on it.
 *
 *   all      present in every selected project
 *   partial  present in at least two, but not all
 *   unique   present in exactly one
 *
 * With a single selected project every term is `unique` — there is nothing to
 * compare it against, which is why the view requires two projects.
 */
export function coverageOf(row, projectIds) {
  const selected = new Set(projectIds || [])
  let present = 0
  for (const projectId of selected) {
    if ((row?.cells?.get?.(projectId)?.values || []).length > 0) present++
  }
  if (present <= 1) return COVERAGE.UNIQUE
  return present === selected.size ? COVERAGE.ALL : COVERAGE.PARTIAL
}

// The five-step scale the status distance is measured on (design §6.1).
export const STATUS_SCALE = ['adopt', 'trial', 'assess', 'hold', 'retire']

export const DELTA = {
  NONE: 'none', // — : coverage unique, nothing to compare
  INCONSISTENT: 'inconsistent',
  UNSET: 'unset',
  ACCEPTED: 'accepted',
  MATCH: 'match',
  MINOR: 'minor',
  SIGNIFICANT: 'significant',
  CRITICAL: 'critical'
}

/** Position of a status on the scale, or -1 for anything not on it. */
export function statusRank(status) {
  return STATUS_SCALE.indexOf(normalize(status))
}

/**
 * The maximum distance over all pairings of a set of ranks. Taking the maximum
 * rather than an average means three projects count as in agreement only when
 * every one of them is — which, on a sorted scale, is max minus min.
 */
export function maxDistance(ranks) {
  if (!ranks.length) return 0
  return Math.max(...ranks) - Math.min(...ranks)
}

/** Distance class per design §6.1: 0 match, 1 minor, 2 significant, >= 3 critical. */
export function classifyDistance(distance) {
  if (distance === 0) return DELTA.MATCH
  if (distance === 1) return DELTA.MINOR
  if (distance === 2) return DELTA.SIGNIFICANT
  return DELTA.CRITICAL
}

/**
 * The Δ status of a row: exactly one badge, chosen by the fixed precedence from
 * design §5.3. The conditions are not mutually exclusive — a term can be
 * inconsistent in project A and unrated in project B — so the order is what
 * keeps `Excluded` free of overlap (DE-8).
 *
 *   1. —              coverage unique
 *   2. ⚠ inconsistent DE-3
 *   3. ⊘ unset        DE-7
 *   4. ✎ accepted     an override is set
 *   5. ✓ ▲ ▲▲ ▲▲▲     status distance
 *
 * Step 1 is first because it enforces `Excluded ⊆ Compared`: what is not
 * compared at all cannot be excluded from the comparison. Steps 2 and 3 outrank
 * the override because a data finding must not be hidden by an accepted
 * difference, and 2 before 3 because two contradictory ratings inside one
 * project are the more urgent finding than a missing one.
 *
 * An excluded state takes the term out of the distance calculation *entirely*.
 * Dropping just the affected project and deriving a distance from the rest would
 * report an agreement produced by omission (design §6.1).
 *
 * `reasons` lists every condition that also applies, for the cell tooltip —
 * nothing is hidden, it is only counted once.
 *
 * @returns {{ delta: string, distance: number|null, reasons: string[] }}
 */
export function deltaOf(row, projectIds, { coverage = null, override = null } = {}) {
  const effectiveCoverage = coverage || coverageOf(row, projectIds)
  const reasons = []

  const participating = (projectIds || [])
    .map((projectId) => row?.cells?.get?.(projectId))
    .filter((cell) => (cell?.values || []).length > 0)

  const inconsistent = participating.some(isCellInconsistent)
  const unset = participating.some((cell) => cell.values.some((value) => normalize(value.status) === ''))
  const accepted = override?.level === 'accepted'

  if (inconsistent) reasons.push(DELTA.INCONSISTENT)
  if (unset) reasons.push(DELTA.UNSET)
  if (accepted) reasons.push(DELTA.ACCEPTED)

  if (effectiveCoverage === COVERAGE.UNIQUE) return { delta: DELTA.NONE, distance: null, reasons }
  if (inconsistent) return { delta: DELTA.INCONSISTENT, distance: null, reasons }
  if (unset) return { delta: DELTA.UNSET, distance: null, reasons }
  if (accepted) return { delta: DELTA.ACCEPTED, distance: null, reasons }

  // Every participating cell holds exactly one status here: inconsistency and
  // unset are already ruled out above.
  const ranks = participating.map((cell) => statusRank(cell.values[0].status))
  // A status outside the five-step scale (an imported catalog could bring one)
  // has no defined distance. Treating it as unset is the honest reading: we
  // cannot say how far apart the projects are.
  if (ranks.some((rank) => rank === -1)) {
    if (!reasons.includes(DELTA.UNSET)) reasons.push(DELTA.UNSET)
    return { delta: DELTA.UNSET, distance: null, reasons }
  }

  const distance = maxDistance(ranks)
  // An upgrade to critical stays *in* Comparable and counts as critical
  // (design §6.2) — unlike "accepted", which takes the term out of it.
  const delta = override?.level === 'critical' ? DELTA.CRITICAL : classifyDistance(distance)
  return { delta, distance, reasons }
}

/**
 * Vocabulary coverage: how many of the distinct raw names the selected projects
 * use are resolved by the vocabulary.
 *
 * The one metric that ignores the kind filter — a name that is not in the
 * vocabulary usually has no reliable kind either, so filtering by kind would
 * quietly hide exactly the names this number is about. It does follow the data
 * source, because the set of names differs between radar and answers (§5.1).
 *
 * Unresolved names are deliberately *not* a fourth exclusion reason. Excluding
 * them would gut the comparison in a fresh workspace. This number qualifies the
 * others instead: it says how much the figures can be trusted (DE-8).
 */
export function vocabularyCoverage(units, aliasIndex) {
  const distinct = new Map()
  for (const unit of units || []) {
    const normalized = normalize(unit.rawName)
    if (normalized === '') continue
    if (!distinct.has(normalized)) {
      distinct.set(normalized, Boolean(aliasIndex instanceof Map && aliasIndex.get(normalized)))
    }
  }
  const total = distinct.size
  const resolved = [...distinct.values()].filter(Boolean).length
  return {
    total,
    resolved,
    unresolved: total - resolved,
    percent: total === 0 ? 100 : Math.round((resolved / total) * 100)
  }
}

/** ≥ 85 % high, 65–84 % moderate, < 65 % low (design §5.2). */
export function agreementLevel(percent) {
  if (percent >= 85) return 'high'
  if (percent >= 65) return 'moderate'
  return 'low'
}

/**
 * Every number the summary card shows. The view renders these and computes
 * nothing itself.
 *
 * Three invariants hold by construction and are asserted in the tests (DE-8):
 *   1. matches + minor + significant + critical === comparable
 *   2. `excluded` counts only within `compared` — never a unique term
 *   3. no term appears in two exclusion reasons; unset + inconsistent +
 *      accepted === excluded exactly, not approximately
 *
 * The second holds because coverage `unique` is the *first* step of the badge
 * precedence: a unique term can very well be internally inconsistent or unrated
 * (DE-3 needs only one project for that), but it was never part of `compared`.
 * Counting it would subtract something that was never in there and make
 * `comparable` too small.
 */
export function computeMetrics(rows, projectIds, { overrides = {}, vocabulary = null } = {}) {
  const selected = projectIds || []
  const counts = {
    total: rows.length,
    all: 0,
    partial: 0,
    unique: 0,
    uniqueByProject: {},
    compared: 0,
    excluded: 0,
    unset: 0,
    inconsistent: 0,
    accepted: 0,
    comparable: 0,
    matches: 0,
    minor: 0,
    significant: 0,
    critical: 0
  }
  selected.forEach((projectId) => {
    counts.uniqueByProject[projectId] = 0
  })

  for (const row of rows) {
    const coverage = coverageOf(row, selected)
    const override = row.term ? overrides[row.term.id] || null : null
    const { delta } = deltaOf(row, selected, { coverage, override })

    if (coverage === COVERAGE.ALL) counts.all++
    if (coverage === COVERAGE.PARTIAL) counts.partial++
    if (coverage === COVERAGE.UNIQUE) {
      counts.unique++
      const owner = selected.find((projectId) => (row.cells.get(projectId)?.values || []).length > 0)
      if (owner !== undefined) counts.uniqueByProject[owner]++
      // Everything below is scoped to `compared` on purpose.
      continue
    }

    counts.compared++
    if (delta === DELTA.INCONSISTENT) counts.inconsistent++
    else if (delta === DELTA.UNSET) counts.unset++
    else if (delta === DELTA.ACCEPTED) counts.accepted++
    else if (delta === DELTA.MATCH) counts.matches++
    else if (delta === DELTA.MINOR) counts.minor++
    else if (delta === DELTA.SIGNIFICANT) counts.significant++
    else if (delta === DELTA.CRITICAL) counts.critical++
  }

  counts.excluded = counts.unset + counts.inconsistent + counts.accepted
  counts.comparable = counts.compared - counts.excluded
  counts.allPercent = counts.total === 0 ? 0 : Math.round((counts.all / counts.total) * 100)
  counts.agreementPercent = counts.comparable === 0 ? 0 : Math.round((counts.matches / counts.comparable) * 100)
  counts.agreementLevel = agreementLevel(counts.agreementPercent)
  if (vocabulary) counts.vocabulary = vocabulary
  return counts
}

export const OVERRIDE_LEVELS = ['accepted', 'critical']

/**
 * Whether a criticality override may be *set* on a row (DE-5).
 *
 * Only on a term that is resolved **and** comparable. Not on a `◌` row — the UI
 * offers the vocabulary assignment first there, which keeps overrides from being
 * orphaned on a spelling that disappears a moment later. And not on a row that
 * already falls out of `Comparable` for another reason (`⚠ inconsistent`,
 * `⊘ unset`) or is not compared at all (`◑ unique`): there is no automatic
 * classification to override.
 */
export function canOverride(row, delta) {
  if (!row?.resolved || !row?.term?.id) return false
  return delta !== DELTA.NONE && delta !== DELTA.INCONSISTENT && delta !== DELTA.UNSET
}

/**
 * The context an override was set in: which projects took part and what each of
 * them said. Stored alongside the decision so a later divergence cannot hide
 * behind an accepted one.
 */
export function overrideContextOf(row, projectIds) {
  const contextProjects = []
  const contextStatuses = {}
  for (const projectId of projectIds || []) {
    const values = row?.cells?.get?.(projectId)?.values || []
    if (!values.length) continue
    contextProjects.push(projectId)
    contextStatuses[projectId] = values[0].status
  }
  return { contextProjects, contextStatuses }
}

/**
 * Whether the situation has moved on since the override was set — a different
 * set of projects, or a different status in one of them.
 *
 * The override stays in force either way; the UI only labels it
 * "manually set — context has changed" so it can be reviewed (DE-5).
 */
export function isOverrideContextChanged(override, row, projectIds) {
  if (!override) return false
  const current = overrideContextOf(row, projectIds)
  const stored = {
    contextProjects: Array.isArray(override.contextProjects) ? override.contextProjects : [],
    contextStatuses: override.contextStatuses || {}
  }
  if ([...current.contextProjects].sort().join('|') !== [...stored.contextProjects].sort().join('|')) return true
  return current.contextProjects.some(
    (projectId) => normalize(current.contextStatuses[projectId]) !== normalize(stored.contextStatuses[projectId])
  )
}

/**
 * True when an override is still stored but the row has since tipped into a
 * state that overrules it (design §5.3). The override is kept — it is the
 * user's reasoning — but it needs a look.
 */
export function isOverrideStale(override, row, delta, projectIds) {
  if (!override) return false
  if (!canOverride(row, delta)) return true
  return isOverrideContextChanged(override, row, projectIds)
}

/**
 * Vocabulary coverage per project: resolved distinct names over distinct names.
 * Counts *names*, not comparison units — ten blips carrying the same unknown
 * spelling are one problem, not ten (design §5.1).
 *
 * Like the workspace-wide figure it follows the data source and ignores the kind
 * filter, so the caller passes in the unfiltered units.
 */
export function coverageByProject(units, aliasIndex, projectIds) {
  const perProject = new Map((projectIds || []).map((projectId) => [projectId, new Map()]))
  for (const unit of units || []) {
    const names = perProject.get(unit.projectId)
    if (!names) continue
    const normalized = normalize(unit.rawName)
    if (normalized === '' || names.has(normalized)) continue
    names.set(normalized, Boolean(aliasIndex instanceof Map && aliasIndex.get(normalized)))
  }
  const result = {}
  for (const [projectId, names] of perProject) {
    const total = names.size
    const resolved = [...names.values()].filter(Boolean).length
    result[projectId] = {
      total,
      resolved,
      unresolved: total - resolved,
      percent: total === 0 ? 100 : Math.round((resolved / total) * 100)
    }
  }
  return result
}

/**
 * Every name the vocabulary does not resolve, grouped by its normalized form —
 * the work list of the vocabulary section.
 *
 * `spellings` keeps each distinct raw writing with the projects that use it, so
 * the UI can show "postgres (Beta)" next to "Postgre SQL (Gamma)". `kind` is the
 * best kind any unit knew, which is what pre-fills "create as its own term".
 */
export function unresolvedNames(units, aliasIndex) {
  const groups = new Map()
  for (const unit of units || []) {
    const key = normalize(unit.rawName)
    if (key === '') continue
    if (aliasIndex instanceof Map && aliasIndex.get(key)) continue

    if (!groups.has(key)) groups.set(key, { key, kind: 'unassigned', spellings: new Map() })
    const group = groups.get(key)
    if (group.kind === 'unassigned' && unit.kind !== 'unassigned') group.kind = unit.kind
    if (!group.spellings.has(unit.rawName)) {
      group.spellings.set(unit.rawName, { rawName: unit.rawName, projectIds: [], origins: [] })
    }
    const spelling = group.spellings.get(unit.rawName)
    if (!spelling.projectIds.includes(unit.projectId)) spelling.projectIds.push(unit.projectId)
    spelling.origins.push(unit.origin)
  }
  return [...groups.values()].map((group) => ({ ...group, spellings: [...group.spellings.values()] }))
}

/** Stable key for a dismissed suggestion: the two normalized names, order-independent. */
export function dismissalKey(rawName, termName) {
  return [normalize(rawName), normalize(termName)].sort().join('||')
}

/**
 * Similarity suggestions for one unresolved group, minus anything the user has
 * already dismissed. A dismissed pair stays dismissed across sessions — a
 * suggestion someone deliberately rejected must not be back on top next time
 * the tab opens (design §5.1).
 */
export function suggestionsForName(key, vocabulary, dismissedSuggestions = []) {
  const dismissed = new Set(dismissedSuggestions || [])
  return findSimilarTerms(key, vocabulary).filter(
    (suggestion) => !dismissed.has(dismissalKey(key, suggestion.term.name))
  )
}

/**
 * Groups that differ only in case or whitespace — "Serilog " and "Serilog".
 * These are the ones "resolve all exact matches" can turn into terms without
 * asking: pure typing and spacing variants, no similarity guessing.
 *
 * Such names already meet in one row through the normalized text fallback
 * (DE-2), so the action does **not** change the comparison result. What it
 * changes is coverage: the row loses its `◌`, is reported as dependable and can
 * carry an override (DE-5).
 *
 * A group whose kind is still unassigned is left out. Kind is mandatory on a
 * term and must not be guessed — even here, where the name itself is certain.
 */
export function exactMatchGroups(units, aliasIndex) {
  return unresolvedNames(units, aliasIndex).filter((group) => group.spellings.length > 1 && group.kind !== 'unassigned')
}

/**
 * The `⁉` marker for a possible false difference (DE-6): a `◑ unique` row whose
 * name the vocabulary does not resolve, *and* the resolved counterpart it
 * resembles. Marking only the unresolved half would leave the other half looking
 * clean, which is exactly half the problem.
 *
 * Deliberately not `⚠` in the UI — that character already stands for
 * `inconsistent` in the same column (design §5.3).
 */
export function markPossibleFalseDifferences(decorated, vocabulary) {
  const unresolvedUnique = decorated.filter((row) => row.coverage === COVERAGE.UNIQUE && !row.resolved)
  const flagged = new Set(unresolvedUnique.map((row) => row.key))

  for (const row of unresolvedUnique) {
    for (const suggestion of findSimilarTerms(row.key.replace(/^raw:/, ''), vocabulary)) {
      const counterpart = decorated.find(
        (other) => other.coverage === COVERAGE.UNIQUE && other.term?.id === suggestion.term.id
      )
      if (counterpart) flagged.add(counterpart.key)
    }
  }
  return flagged
}

/**
 * The full comparison result: one decorated row per term, plus the metrics. This
 * is what the view renders — it may sort and filter, but must not compute.
 */
export function buildComparison(workspace, projectIds, { source = 'radar', visibleKinds = null, aliasIndex } = {}) {
  const allUnits = collectUnits(workspace, projectIds, { source, aliasIndex })
  const units = visibleKinds ? allUnits.filter((unit) => visibleKinds.includes(unit.kind)) : allUnits
  const overrides = workspace?.comparisonOverrides || {}

  const rows = buildRows(units, aliasIndex)
  const decorated = rows.map((row) => {
    const coverage = coverageOf(row, projectIds)
    const override = row.term ? overrides[row.term.id] || null : null
    const { delta, distance, reasons } = deltaOf(row, projectIds, { coverage, override })
    return {
      ...row,
      coverage,
      delta,
      distance,
      reasons,
      override,
      overrideStale: isOverrideStale(override, row, delta, projectIds),
      canOverride: canOverride(row, delta)
    }
  })

  const flagged = markPossibleFalseDifferences(decorated, workspace?.vocabulary || [])
  decorated.forEach((row) => {
    row.possibleFalseDifference = flagged.has(row.key)
  })

  return {
    allUnits,
    units,
    rows: decorated,
    metrics: computeMetrics(rows, projectIds, {
      overrides,
      vocabulary: vocabularyCoverage(allUnits, aliasIndex)
    })
  }
}

// ── Radar overlay (design §5.4) ──────────────────────────────────────────────
//
// An overlay of the compared projects' radars. Quadrant labels and the
// category-to-quadrant assignment are configured *per project*, so one chosen
// reference project provides the layout; a blip whose category the reference
// does not know lands in the leftover quadrant "Other".

export const OTHER_QUADRANT = 3

/** Category -> quadrant index, as the reference project has it configured. */
export function quadrantMapOf(project) {
  const configured = project?.radarCategoryQuadrants
  if (configured && typeof configured === 'object') return new Map(Object.entries(configured))
  // Without an explicit assignment the category order decides, the same way the
  // radar itself derives it.
  const order = Array.isArray(project?.radarCategoryOrder) ? project.radarCategoryOrder : []
  return new Map(order.map((category, index) => [category, Math.min(index, OTHER_QUADRANT)]))
}

/**
 * Overlay points and conflict lines for the comparison rows.
 *
 * The four special cases look deliberately different rather than all being
 * "dimmed" (design §5.4):
 *
 *   ⊘ no status          not plotted — there is no ring for it; listed instead
 *   ⚠ internally uneven  plotted at every affected ring, that project's own
 *                        positions joined by a line; no cross-project conflict line
 *   ◌ unresolved name    plotted normally, dashed outline; no conflict line,
 *                        because the identity is unclear
 *   ⬚ kind unknown       plotted normally but pale
 *
 * Conflict lines are drawn from distance 2 upwards — below that the projects are
 * close enough that a line would be noise.
 */
export function buildRadarOverlay(rows, projectIds, referenceProject, { minConflictDistance = 2 } = {}) {
  const quadrants = quadrantMapOf(referenceProject)
  const points = []
  const conflicts = []
  const withoutStatus = []

  for (const row of rows) {
    const rowPoints = []
    for (const projectId of projectIds) {
      const cell = row.cells.get(projectId)
      if (!cell) continue

      for (const value of cell.values) {
        const ring = statusRank(value.status)
        if (ring === -1) {
          withoutStatus.push({ key: row.key, name: row.name, projectId, origin: value.origin })
          continue
        }
        const quadrant = quadrants.has(value.origin.categoryTitle)
          ? Number(quadrants.get(value.origin.categoryTitle))
          : OTHER_QUADRANT
        rowPoints.push({
          key: row.key,
          name: row.name,
          projectId,
          ring,
          quadrant,
          status: value.status,
          unresolved: !row.resolved,
          unassignedKind: row.kind === 'unassigned',
          origin: value.origin
        })
      }
    }
    points.push(...rowPoints)

    // A project that contradicts itself gets its own positions joined; no
    // cross-project line is drawn for that row, because there is no single
    // position to draw it from.
    const byProject = new Map()
    rowPoints.forEach((point) => {
      if (!byProject.has(point.projectId)) byProject.set(point.projectId, [])
      byProject.get(point.projectId).push(point)
    })
    let internallyUneven = false
    for (const [projectId, projectPoints] of byProject) {
      if (new Set(projectPoints.map((point) => point.ring)).size > 1) {
        internallyUneven = true
        conflicts.push({ key: row.key, kind: 'internal', projectId, points: projectPoints })
      }
    }
    if (internallyUneven || !row.resolved || byProject.size < 2) continue

    const rings = rowPoints.map((point) => point.ring)
    const distance = maxDistance(rings)
    if (distance < minConflictDistance) continue
    const lowest = rowPoints.find((point) => point.ring === Math.min(...rings))
    const highest = rowPoints.find((point) => point.ring === Math.max(...rings))
    conflicts.push({ key: row.key, kind: 'cross-project', distance, points: [lowest, highest] })
  }

  return { points, conflicts, withoutStatus }
}
