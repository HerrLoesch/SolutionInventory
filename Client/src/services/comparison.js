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
import { normalize, findSimilarTerms, buildAliasIndex } from './vocabulary'

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

/** Display form of the five rings, from the innermost outwards. */
export const STATUS_LABELS = ['Adopt', 'Trial', 'Assess', 'Hold', 'Retire']

export const DELTA = {
  NONE: 'none', // — : coverage unique, nothing to compare
  INCONSISTENT: 'inconsistent',
  UNSET: 'unset',
  ACCEPTED: 'accepted',
  SILENT: 'silent',
  UNLISTED: 'unlisted', // ⊙ : not in the reference the comparison runs against
  MISSING: 'missing', // ⊖ : in the reference, but no project uses it
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
 * The status as it should be *shown*: the canonical spelling from
 * STATUS_LABELS when the value is on the scale.
 *
 * Statuses are free text — they come from a catalog's statusOptions labels and
 * from hand-edited blips, so the same workspace holds "Adopt" and "adopt". The
 * engine has always normalized before ranking, so the comparison never saw a
 * difference; only the table did, and it read like a data problem where there
 * was none.
 *
 * A status *off* the scale is returned untouched. Rewriting it would hide a
 * real finding: such a value already classifies the row as `⊘ unset`, and
 * making it look canonical would suggest it had been understood. Nothing here
 * writes back to the stored data either — cleaning the projects themselves is
 * the MCP server's `export_cleaned_data` (docs/todos.md §2), not this tab's.
 */
export function canonicalStatus(status) {
  const rank = statusRank(status)
  if (rank === -1) return String(status || '').trim()
  return STATUS_LABELS[rank]
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

// ── Silent acceptance (F3) ───────────────────────────────────────────────────
//
// One project going along with what another says, in the two shapes that
// question actually takes:
//
//   absence  the project says nothing about the term and accepts what the
//            others say — "I simply have no other opinion"
//   status   the project says something *different* and accepts another
//            project's status instead
//
// This is not the `✎ accepted` override. That one takes a term *out* of
// Comparable, because the difference was judged not worth measuring. A silent
// acceptance is the opposite: agreement was reached, so the term stays in and
// counts as a match. Excluding it would make the agreement figure fall the more
// people agree, which is the one thing it must never do.

export const ACCEPTANCE_MODES = ['absence', 'status']

/**
 * The acceptances on this row that actually apply right now, by project id.
 *
 * An acceptance is stored as a decision and checked against the current data
 * every time, never trusted blindly: a project that has since formed its own
 * opinion is no longer accepting an absence, and a status accepted from a
 * project that is not in the selection cannot be resolved to a rank. In both
 * cases the entry stays stored — it is the user's reasoning — but it does not
 * silently change a number it no longer fits.
 */
export function effectiveAcceptances(row, projectIds, acceptances) {
  const selected = new Set(projectIds || [])
  const applied = new Map()

  for (const [projectId, acceptance] of Object.entries(acceptances || {})) {
    if (!selected.has(projectId)) continue
    const values = row?.cells?.get?.(projectId)?.values || []

    if (acceptance?.mode === 'absence') {
      // The project has an opinion after all; there is no absence to accept.
      if (values.length) continue
      applied.set(projectId, acceptance)
      continue
    }

    if (acceptance?.mode === 'status') {
      if (!values.length) continue
      const from = acceptance.acceptedFrom
      if (!from || from === projectId || !selected.has(from)) continue
      if (!(row?.cells?.get?.(from)?.values || []).length) continue
      applied.set(projectId, acceptance)
    }
  }
  return applied
}

// ── Reference baselines (F7) ─────────────────────────────────────────────────
//
// A held-still target state every project is measured against one by one,
// instead of measuring the projects against each other. The two questions are
// genuinely different: "do we agree" and "does everyone follow the standard"
// have different answers as soon as the standard is not what the majority does.
//
// A baseline is a flat map from row key to the status that is supposed to hold.
// It is a *copy*, deliberately: the point is that it stays put while the
// projects move.

/**
 * A baseline taken from one project's column.
 *
 * A cell that contradicts itself is left out and reported in `skipped` instead:
 * a reference that freezes a contradiction is not a reference, and picking one
 * of the two takes at random would put a coin toss into every later figure. So
 * is a status the scale does not know — there would be no distance to measure
 * against it.
 */
export function buildBaselineFromProject(rows, projectId) {
  const entries = {}
  const skipped = []

  for (const row of rows || []) {
    const values = row?.cells?.get?.(projectId)?.values || []
    if (!values.length) continue
    const statuses = new Set(values.map((value) => normalize(value.status)))
    if (statuses.size > 1) {
      skipped.push({ key: row.key, name: row.name, reason: DELTA.INCONSISTENT })
      continue
    }
    if (statusRank(values[0].status) === -1) {
      skipped.push({ key: row.key, name: row.name, reason: DELTA.UNSET })
      continue
    }
    entries[row.key] = { name: row.name, status: canonicalStatus(values[0].status) }
  }
  return { entries, skipped }
}

/**
 * A baseline taken from what the projects mostly say: per row the most common
 * status among the selected projects.
 *
 * A tie is skipped rather than broken. "Half of us say Adopt and half say
 * Retire" is not a target state, and picking the alphabetically first one would
 * dress a disagreement up as a decision.
 */
export function buildBaselineFromConsensus(rows, projectIds) {
  const selected = projectIds || []
  const entries = {}
  const skipped = []

  for (const row of rows || []) {
    const tally = new Map()
    for (const projectId of selected) {
      const values = row?.cells?.get?.(projectId)?.values || []
      if (values.length !== 1) continue
      const rank = statusRank(values[0].status)
      if (rank === -1) continue
      tally.set(rank, (tally.get(rank) || 0) + 1)
    }
    if (!tally.size) {
      skipped.push({ key: row.key, name: row.name, reason: DELTA.UNSET })
      continue
    }
    const top = Math.max(...tally.values())
    const leaders = [...tally.entries()].filter(([, count]) => count === top)
    if (leaders.length > 1) {
      skipped.push({ key: row.key, name: row.name, reason: 'tie' })
      continue
    }
    entries[row.key] = { name: row.name, status: STATUS_LABELS[leaders[0][0]] }
  }
  return { entries, skipped }
}

/** The status a baseline holds for a row, or '' when it does not list it. */
export function baselineStatusOf(baseline, rowKey) {
  return baseline?.entries?.[rowKey]?.status || ''
}

/**
 * The rank a project contributes to a row once its silent acceptance is taken
 * into account, or -1 when it contributes none.
 *
 * -1 covers three different situations on purpose — no entry, several
 * contradictory ones, and a status the scale does not know. They differ in what
 * they mean, and every caller reports that difference in its own way, but they
 * are the same thing to arithmetic: there is no distance to measure.
 */
function acceptedRankOf(row, projectId, applied) {
  const acceptance = applied?.get?.(projectId)
  const source = acceptance?.mode === 'status' ? acceptance.acceptedFrom : projectId
  const values = row?.cells?.get?.(source)?.values || []
  if (values.length !== 1) return -1
  return statusRank(values[0].status)
}

/**
 * The Δ status of a row: exactly one badge, chosen by the fixed precedence from
 * design §5.3. The conditions are not mutually exclusive — a term can be
 * inconsistent in project A and unrated in project B — so the order is what
 * keeps `Excluded` free of overlap (DE-8).
 *
 *   1. —                 nothing to compare
 *   2. ⚠ inconsistent    DE-3
 *   3. ⊘ unset           DE-7
 *   4. ✎ accepted        an override is set
 *   5. ≈ silent          a silent acceptance settled it (F3)
 *   6. ✓ ▲ ▲▲ ▲▲▲        status distance
 *
 * Step 1 is first because it enforces `Excluded ⊆ Compared`: what is not
 * compared at all cannot be excluded from the comparison. Steps 2 and 3 outrank
 * the override because a data finding must not be hidden by an accepted
 * difference, and 2 before 3 because two contradictory ratings inside one
 * project are the more urgent finding than a missing one. The override outranks
 * the silent acceptance because it is the explicit decision of the two.
 *
 * Step 1 is also where an accepted *absence* earns the row its place: a term
 * only one project rates is normally `—`, but once another project has said it
 * goes along with that rating, there is something to report.
 *
 * An excluded state takes the term out of the distance calculation *entirely*.
 * Dropping just the affected project and deriving a distance from the rest would
 * report an agreement produced by omission (design §6.1). A silent acceptance is
 * the one case where a project's own value is set aside — and only because
 * somebody said in so many words that it should be.
 *
 * `reasons` lists every condition that also applies, for the cell tooltip —
 * nothing is hidden, it is only counted once.
 *
 * @returns {{ delta: string, distance: number|null, reasons: string[] }}
 */
export function deltaOf(
  row,
  projectIds,
  { coverage = null, override = null, acceptances = null, baseline = null } = {}
) {
  const effectiveCoverage = coverage || coverageOf(row, projectIds)
  const reasons = []
  const applied = effectiveAcceptances(row, projectIds, acceptances)

  const participatingIds = (projectIds || []).filter(
    (projectId) => (row?.cells?.get?.(projectId)?.values || []).length > 0
  )
  const participating = participatingIds.map((projectId) => row.cells.get(projectId))

  const inconsistent = participating.some(isCellInconsistent)
  const unset = participating.some((cell) => cell.values.some((value) => normalize(value.status) === ''))
  const accepted = override?.level === 'accepted'
  const silent = applied.size > 0

  if (inconsistent) reasons.push(DELTA.INCONSISTENT)
  if (unset) reasons.push(DELTA.UNSET)
  if (accepted) reasons.push(DELTA.ACCEPTED)
  if (silent) reasons.push(DELTA.SILENT)

  // Against a reference (F7) the question is a different one: not "do the
  // projects agree with each other" but "does each of them match the target".
  // A term the reference does not list has no target to match, and a term no
  // project uses is a gap in the projects rather than a divergence between
  // them — both are reported as themselves rather than folded into `—`.
  if (baseline) {
    const target = statusRank(baselineStatusOf(baseline, row?.key))
    if (target === -1) return { delta: DELTA.UNLISTED, distance: null, reasons }
    if (!participating.length) return { delta: DELTA.MISSING, distance: null, reasons }
    if (inconsistent) return { delta: DELTA.INCONSISTENT, distance: null, reasons }
    if (unset) return { delta: DELTA.UNSET, distance: null, reasons }
    if (accepted) return { delta: DELTA.ACCEPTED, distance: null, reasons }

    const ranks = participatingIds.map((projectId) => {
      const acceptance = applied.get(projectId)
      const source = acceptance?.mode === 'status' ? acceptance.acceptedFrom : projectId
      return statusRank(row.cells.get(source).values[0].status)
    })
    // The same reading as in peer mode: a status the scale does not know has no
    // distance to the target. `|-1 - target|` is an arithmetic result, not a
    // distance — reporting it would turn "we cannot say" into "▲ minor".
    if (ranks.some((rank) => rank === -1)) {
      if (!reasons.includes(DELTA.UNSET)) reasons.push(DELTA.UNSET)
      return { delta: DELTA.UNSET, distance: null, reasons }
    }
    const worst = Math.max(...ranks.map((rank) => Math.abs(rank - target)))
    if (override?.level === 'critical') return { delta: DELTA.CRITICAL, distance: worst, reasons }
    if (silent && worst === 0) return { delta: DELTA.SILENT, distance: worst, reasons }
    return { delta: classifyDistance(worst), distance: worst, reasons }
  }

  // A project that accepts the absence joins the comparison without adding a
  // rank: it is a voice, not a second data point. It is also the only thing
  // that can pull a `◑ unique` row into the comparison — and it still needs
  // somebody to be accepting *something*.
  const acceptedAbsences = [...applied.values()].filter((entry) => entry.mode === 'absence').length
  const notCompared =
    participating.length === 0 || (effectiveCoverage === COVERAGE.UNIQUE && acceptedAbsences === 0)
  if (notCompared) return { delta: DELTA.NONE, distance: null, reasons }
  if (inconsistent) return { delta: DELTA.INCONSISTENT, distance: null, reasons }
  if (unset) return { delta: DELTA.UNSET, distance: null, reasons }
  if (accepted) return { delta: DELTA.ACCEPTED, distance: null, reasons }

  // Every participating cell holds exactly one status here: inconsistency and
  // unset are already ruled out above. A project accepting another's status
  // contributes that other project's rank instead of its own.
  const ranks = participatingIds.map((projectId) => {
    const acceptance = applied.get(projectId)
    const source = acceptance?.mode === 'status' ? acceptance.acceptedFrom : projectId
    return statusRank(row.cells.get(source).values[0].status)
  })
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
  if (override?.level === 'critical') return { delta: DELTA.CRITICAL, distance, reasons }
  // A remaining distance means a *third* project still disagrees. Two projects
  // settling their difference must not hide that one.
  if (silent && distance === 0) return { delta: DELTA.SILENT, distance, reasons }
  return { delta: classifyDistance(distance), distance, reasons }
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
 *   2. `excluded` counts only within `compared` — never an uncompared term
 *   3. no term appears in two exclusion reasons; unset + inconsistent +
 *      accepted === excluded exactly, not approximately
 *
 * The second holds because `—` is the *first* step of the badge precedence: an
 * uncompared term can very well be internally inconsistent or unrated (DE-3
 * needs only one project for that), but it was never part of `compared`.
 * Counting it would subtract something that was never in there and make
 * `comparable` too small.
 *
 * Whether a row is compared is read off its Δ rather than off its coverage: a
 * silently accepted absence (F3) leaves the coverage at `◑ unique` — that is
 * still the fact of the matter — while the row does now belong in the
 * comparison. Coverage reports what the data says, Δ reports what it means.
 *
 * `silent` counts as a match, because that is what it is: agreement. It is also
 * reported on its own, so a high agreement figure can always be asked how much
 * of it was decided rather than found.
 */
export function computeMetrics(
  rows,
  projectIds,
  { overrides = {}, acceptances = {}, baseline = null, vocabulary = null, ignoredCount = 0 } = {}
) {
  const selected = projectIds || []
  const counts = {
    total: rows.length,
    // Rows taken out by hand. Counted *next to* the figures rather than in
    // them, so nobody reads an agreement that was produced by leaving things
    // out without seeing how much was left out (F1).
    ignored: ignoredCount,
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
    // Part of `matches`, never in addition to it (F3).
    silent: 0,
    // Baseline mode only (F7): rows with no target to match, and targets no
    // project uses. Neither is a divergence, so neither is compared.
    unlisted: 0,
    missing: 0,
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
    const { delta } = deltaOf(row, selected, { coverage, override, acceptances: acceptances[row.key], baseline })

    // The coverage buckets describe what the *projects* say. A reference row no
    // project produced (F7) says nothing about coverage: coverageOf reports it
    // as `unique` because it conflates "one project" with "none", and counting
    // it there would make `unique` bigger than its own per-project breakdown.
    // It is reported as `⊖ missing` below instead.
    const owner = selected.find((projectId) => (row.cells.get(projectId)?.values || []).length > 0)
    if (owner !== undefined) {
      if (coverage === COVERAGE.ALL) counts.all++
      if (coverage === COVERAGE.PARTIAL) counts.partial++
      if (coverage === COVERAGE.UNIQUE) {
        counts.unique++
        counts.uniqueByProject[owner]++
      }
    }

    // Everything below is scoped to `compared` on purpose.
    if (delta === DELTA.UNLISTED) {
      counts.unlisted++
      continue
    }
    if (delta === DELTA.MISSING) {
      counts.missing++
      continue
    }
    if (delta === DELTA.NONE) continue

    counts.compared++
    if (delta === DELTA.INCONSISTENT) counts.inconsistent++
    else if (delta === DELTA.UNSET) counts.unset++
    else if (delta === DELTA.ACCEPTED) counts.accepted++
    else if (delta === DELTA.SILENT) {
      counts.silent++
      counts.matches++
    } else if (delta === DELTA.MATCH) counts.matches++
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

/**
 * How closely each project follows a reference, one project at a time (F7).
 *
 * This is the figure the reference exists for: `agreementPercent` says whether
 * the projects agree with *each other*, which can be high while every one of
 * them ignores the target. Counted only over rows the reference lists and the
 * project actually rates — a project cannot follow a target it was never asked
 * about, and counting those as misses would punish it for the reference being
 * broader than its own scope.
 *
 * `comparedRows` travels with the percentage everywhere it is shown. 100 % out
 * of three rows and 100 % out of three hundred are not the same statement.
 */
export function computeBaselineAgreement(rows, projectIds, baseline, { acceptances = {} } = {}) {
  const result = {}

  for (const projectId of projectIds || []) {
    const byClass = { match: 0, minor: 0, significant: 0, critical: 0 }
    let comparedRows = 0

    for (const row of rows || []) {
      const target = statusRank(baselineStatusOf(baseline, row.key))
      if (target === -1) continue

      const applied = effectiveAcceptances(row, projectIds, acceptances[row.key])
      const rank = acceptedRankOf(row, projectId, applied)
      if (rank === -1) continue

      comparedRows++
      byClass[classifyDistance(Math.abs(rank - target))]++
    }

    result[projectId] = {
      comparedRows,
      byClass,
      percent: comparedRows === 0 ? 0 : Math.round((byClass.match / comparedRows) * 100)
    }
  }
  return result
}

/**
 * How far apart two projects are, one pair at a time (F8).
 *
 * The summary's `agreementPercent` is a single number over all projects at
 * once: it says *that* the workspace disagrees, never *who* with whom. Three
 * projects where two are identical and the third is far out read exactly like
 * three projects that each drift a little.
 *
 *   percent = Σ distance / (4 × comparedRows) × 100
 *
 * 0 % is identical, 100 % is every term at opposite ends of the scale. Counted
 * over the rows where *both* projects give exactly one status on the scale —
 * anywhere else there is no defined distance, and guessing one would be putting
 * a number on an absence.
 *
 * A project that silently accepted the other's status (F3) is measured by what
 * it accepted, exactly as everywhere else: the pair settled it, so the pair is
 * not apart on that row. It is *not* dropped from the count, though — dropping
 * the rows two projects agree on would remove the zeros and drive the figure up
 * the more they agree.
 *
 * `comparedRows` is returned with every percentage and must be shown with it:
 * 100 % out of three rows and 100 % out of three hundred are not the same
 * statement.
 */
export function computePairwiseDivergence(rows, projectIds, { acceptances = {} } = {}) {
  const ids = projectIds || []
  const worstDistance = STATUS_SCALE.length - 1
  const pairs = []

  for (let first = 0; first < ids.length; first++) {
    for (let second = first + 1; second < ids.length; second++) {
      const a = ids[first]
      const b = ids[second]
      const byClass = { match: 0, minor: 0, significant: 0, critical: 0 }
      let comparedRows = 0
      let total = 0

      for (const row of rows || []) {
        const applied = effectiveAcceptances(row, ids, acceptances[row.key])
        const rankA = acceptedRankOf(row, a, applied)
        const rankB = acceptedRankOf(row, b, applied)
        if (rankA === -1 || rankB === -1) continue

        const distance = Math.abs(rankA - rankB)
        comparedRows++
        total += distance
        byClass[classifyDistance(distance)]++
      }

      pairs.push({
        a,
        b,
        comparedRows,
        byClass,
        percent: comparedRows === 0 ? 0 : Math.round((total / (comparedRows * worstDistance)) * 100)
      })
    }
  }
  return pairs
}

export const OVERRIDE_LEVELS = ['accepted', 'critical']

/**
 * Whether a criticality override may be *set* on a row (DE-5).
 *
 * Only on a term that is resolved **and** comparable. Not on a `◌` row — the UI
 * offers the vocabulary assignment first there, which keeps overrides from being
 * orphaned on a spelling that disappears a moment later. And not on a row that
 * already falls out of `Comparable` for another reason (`⚠ inconsistent`,
 * `⊘ unset`) or is not compared at all (`◑ unique`, and against a reference
 * `⊙ unlisted` / `⊖ missing`): there is no automatic classification to override.
 */
export function canOverride(row, delta) {
  if (!row?.resolved || !row?.term?.id) return false
  return ![DELTA.NONE, DELTA.INCONSISTENT, DELTA.UNSET, DELTA.UNLISTED, DELTA.MISSING].includes(delta)
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
 * The projects whose silent acceptance (F3) needs looking at: it is stored but
 * either does not apply any more, or was taken in a situation that has since
 * moved on.
 *
 * The same reasoning as for overrides, and deliberately the same context check:
 * a project must not go on silently agreeing with a statement nobody is making
 * any more. The decision is kept either way — it is the user's reasoning, not
 * the engine's — but it is flagged rather than applied quietly.
 */
export function staleAcceptanceProjectIds(row, projectIds, acceptances, applied = null) {
  const inForce = applied || effectiveAcceptances(row, projectIds, acceptances)
  const selected = new Set(projectIds || [])
  const stale = []

  for (const [projectId, acceptance] of Object.entries(acceptances || {})) {
    if (!selected.has(projectId)) continue
    if (!inForce.has(projectId)) {
      stale.push(projectId)
      continue
    }
    if (isOverrideContextChanged(acceptance, row, projectIds)) stale.push(projectId)
  }
  return stale
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
export function suggestionsForName(key, vocabulary, dismissedSuggestions = [], { index = null } = {}) {
  const dismissed = new Set(dismissedSuggestions || [])
  return findSimilarTerms(key, vocabulary, { index }).filter(
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
export function markPossibleFalseDifferences(decorated) {
  // `row.cells.size === 0` is the reference's own row for a target no project
  // uses (F7). ⁉ says "this difference may not be real"; that row is not a
  // difference at all, it is the gap the reference exists to show.
  const unresolvedUnique = decorated.filter(
    (row) => row.coverage === COVERAGE.UNIQUE && !row.resolved && row.cells.size > 0
  )
  const flagged = new Set(unresolvedUnique.map((row) => row.key))
  if (!unresolvedUnique.length) return flagged

  // Only a term that *is* a unique row can be the counterpart, so only those are
  // searched. Asking the whole vocabulary and discarding the rest a line later
  // is the single most expensive thing this engine did at a few hundred blips
  // per project — and the top-five cut of findSimilarTerms could let unrelated
  // terms crowd out the very counterpart this is looking for.
  const uniqueByTermId = new Map()
  for (const row of decorated) {
    if (row.coverage === COVERAGE.UNIQUE && row.term?.id) uniqueByTermId.set(row.term.id, row)
  }
  if (!uniqueByTermId.size) return flagged
  const candidates = [...uniqueByTermId.values()].map((row) => row.term)
  const index = buildAliasIndex(candidates).index

  for (const row of unresolvedUnique) {
    for (const suggestion of findSimilarTerms(row.key.replace(/^raw:/, ''), candidates, { limit: Infinity, index })) {
      const counterpart = uniqueByTermId.get(suggestion.term.id)
      if (counterpart) flagged.add(counterpart.key)
    }
  }
  return flagged
}

/**
 * The full comparison result: one decorated row per term, plus the metrics. This
 * is what the view renders — it may sort and filter, but must not compute.
 *
 * Rows marked "not important" (F1) come back separately in `ignoredRows` and
 * are absent from `rows` and from every metric, `total` included. That is the
 * difference between the mark and a filter: a filter hides a row from the eye,
 * this one takes it out of the question being asked. `metrics.ignored` says how
 * many, so a figure produced by leaving things out still announces itself.
 */
export function buildComparison(
  workspace,
  projectIds,
  { source = 'radar', visibleKinds = null, aliasIndex, baseline = null } = {}
) {
  const allUnits = collectUnits(workspace, projectIds, { source, aliasIndex })
  const units = visibleKinds ? allUnits.filter((unit) => visibleKinds.includes(unit.kind)) : allUnits
  const overrides = workspace?.comparisonOverrides || {}
  const ignored = workspace?.comparisonIgnored || {}
  const acceptances = workspace?.comparisonAcceptances || {}

  // A reference can hold a target for a term no selected project uses at all.
  // No unit produces that row, so it would simply be absent — and a target
  // nobody follows is exactly the thing a reference is meant to surface. The
  // row is built empty and lands on `⊖ missing` in deltaOf.
  const rows = buildRows(units, aliasIndex)
  if (baseline) {
    const present = new Set(rows.map((row) => row.key))
    for (const [key, entry] of Object.entries(baseline.entries || {})) {
      if (present.has(key)) continue
      rows.push({
        key,
        term: null,
        name: entry?.name || key,
        resolved: key.startsWith('term:'),
        kind: 'unassigned',
        cells: new Map()
      })
    }
  }

  const decorated = rows.map((row) => {
    const coverage = coverageOf(row, projectIds)
    const override = row.term ? overrides[row.term.id] || null : null
    const rowAcceptances = acceptances[row.key] || null
    const { delta, distance, reasons } = deltaOf(row, projectIds, {
      coverage,
      override,
      acceptances: rowAcceptances,
      baseline
    })
    const applied = effectiveAcceptances(row, projectIds, rowAcceptances)
    return {
      ...row,
      coverage,
      delta,
      distance,
      reasons,
      baselineStatus: baseline ? baselineStatusOf(baseline, row.key) : '',
      override,
      overrideStale: isOverrideStale(override, row, delta, projectIds),
      canOverride: canOverride(row, delta),
      ignored: ignored[row.key] || null,
      // What is stored, and what of it actually applies right now — the two are
      // deliberately kept apart so the cell can show a decision that no longer
      // fits the data instead of quietly dropping it.
      acceptances: rowAcceptances,
      appliedAcceptances: applied,
      staleAcceptances: staleAcceptanceProjectIds(row, projectIds, rowAcceptances, applied)
    }
  })

  // The ⁉ marker is derived over the rows that are actually compared: an
  // ignored row cannot be a false difference, because it is not a difference.
  const compared = decorated.filter((row) => !row.ignored)
  const ignoredRows = decorated.filter((row) => row.ignored)
  const flagged = markPossibleFalseDifferences(compared)
  decorated.forEach((row) => {
    row.possibleFalseDifference = flagged.has(row.key)
  })

  const measured = rows.filter((row) => !ignored[row.key])
  return {
    allUnits,
    units,
    rows: compared,
    ignoredRows,
    baseline,
    // Only meaningful against a reference; an empty object otherwise, so the
    // view never has to guard for the shape.
    baselineAgreement: baseline ? computeBaselineAgreement(measured, projectIds, baseline, { acceptances }) : {},
    pairwiseDivergence: computePairwiseDivergence(measured, projectIds, { acceptances }),
    metrics: computeMetrics(measured, projectIds, {
      overrides,
      acceptances,
      baseline,
      ignoredCount: ignoredRows.length,
      vocabulary: vocabularyCoverage(allUnits, aliasIndex)
    })
  }
}

// ── Sorting the matrix (F6) ──────────────────────────────────────────────────
//
// The table is sorted by clicking a column header, so the comparator has to
// know about every column — including one per project. It lives here rather
// than in the view for the same reason everything else does: ordering rows by
// "worst status in this project" is a statement about the comparison, not about
// the table.
//
// `asc` is the order a first click produces, and it is the *useful* one per
// column rather than a literal ascent: the thing worth looking at first comes
// first. Sorting a matrix of findings alphabetically-by-accident on the first
// click is the behaviour this replaces.

/** Widest coverage first. */
export const COVERAGE_SORT_ORDER = [COVERAGE.ALL, COVERAGE.PARTIAL, COVERAGE.UNIQUE]

/** Most notable divergence first; `—` (nothing to compare) last. */
export const DELTA_SORT_ORDER = [
  DELTA.CRITICAL,
  DELTA.SIGNIFICANT,
  DELTA.MINOR,
  DELTA.INCONSISTENT,
  DELTA.UNSET,
  DELTA.ACCEPTED,
  DELTA.SILENT,
  DELTA.MATCH,
  DELTA.NONE
]

export const SORT_COLUMN = { TERM: 'term', BASELINE: 'baseline', COVERAGE: 'coverage', DELTA: 'delta' }

/** The sort column id of a project column. */
export function projectSortColumn(projectId) {
  return `project:${projectId}`
}

/** The project id a project column sorts by, or '' for any other column. */
export function projectIdOfSortColumn(column) {
  return String(column || '').startsWith('project:') ? String(column).slice('project:'.length) : ''
}

/**
 * How a row ranks in one project's column.
 *
 * Three groups, and the group is *never* flipped by the sort direction: a cell
 * the project says nothing about belongs at the end either way. It is not the
 * "best" or the "worst" status, it is the absence of one, and letting it head
 * the table on a descending sort would read as a finding.
 *
 * Within the ranked group a cell with several takes counts by its worst one —
 * the same reading the ⚠ badge already gives that cell.
 */
function projectSortKey(row, projectId) {
  const values = row?.cells?.get?.(projectId)?.values || []
  if (!values.length) return { group: 2, rank: 0 }
  const ranked = values.map((value) => statusRank(value.status)).filter((rank) => rank !== -1)
  if (!ranked.length) return { group: 1, rank: 0 }
  return { group: 0, rank: Math.max(...ranked) }
}

/** Index in a fixed order, with anything unknown sorted after all of it. */
function orderIndex(order, value) {
  const index = order.indexOf(value)
  return index === -1 ? order.length : index
}

/**
 * Compares two decorated rows for one column and direction.
 *
 * The term name is always the tiebreaker, so the same selection sorts the same
 * way twice. Without it the order would depend on the order the rows happened
 * to be built in, and the table would rearrange itself under an unrelated edit.
 */
export function compareRows(a, b, { column = SORT_COLUMN.TERM, direction = 'asc' } = {}) {
  const sign = direction === 'desc' ? -1 : 1
  const byName = String(a?.name || '').localeCompare(String(b?.name || ''))

  const projectId = projectIdOfSortColumn(column)
  if (projectId) {
    const keyA = projectSortKey(a, projectId)
    const keyB = projectSortKey(b, projectId)
    if (keyA.group !== keyB.group) return keyA.group - keyB.group
    if (keyA.rank !== keyB.rank) return sign * (keyA.rank - keyB.rank)
    return byName
  }

  if (column === SORT_COLUMN.BASELINE) {
    // Same reading as a project column: best target first, no target last.
    const rankA = statusRank(a?.baselineStatus)
    const rankB = statusRank(b?.baselineStatus)
    if (rankA === -1 || rankB === -1) {
      if (rankA !== rankB) return rankA === -1 ? 1 : -1
      return byName
    }
    if (rankA !== rankB) return sign * (rankA - rankB)
    return byName
  }

  if (column === SORT_COLUMN.COVERAGE) {
    const byCoverage = orderIndex(COVERAGE_SORT_ORDER, a?.coverage) - orderIndex(COVERAGE_SORT_ORDER, b?.coverage)
    if (byCoverage !== 0) return sign * byCoverage
    return byName
  }

  if (column === SORT_COLUMN.DELTA) {
    const byDelta = orderIndex(DELTA_SORT_ORDER, a?.delta) - orderIndex(DELTA_SORT_ORDER, b?.delta)
    if (byDelta !== 0) return sign * byDelta
    return byName
  }

  return sign * byName
}

/** The rows in the order one column asks for. Does not mutate the input. */
export function sortRows(rows, options = {}) {
  return [...(rows || [])].sort((a, b) => compareRows(a, b, options))
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
 * What to write in each of the four corners: the reference project's own
 * quadrant label if it has one, otherwise the categories it files there — the
 * same derivation the project's radar uses for its corner labels.
 *
 * Without labels the overlay is a ring of dots that says nothing about *what*
 * is being compared, which is the single biggest reason the chart is hard to
 * read. The leftover quadrant also announces itself as the catch-all, because
 * that is where a category the reference project does not know ends up.
 */
export function quadrantLabelsOf(project) {
  const overrides = project?.radarQuadrantLabels || {}
  const byQuadrant = [[], [], [], []]
  for (const [category, quadrant] of quadrantMapOf(project)) {
    const index = Number(quadrant)
    if (index >= 0 && index < 4) byQuadrant[index].push(category)
  }

  return byQuadrant.map((categories, index) => {
    const override = String(overrides[index] || '').trim()
    if (override) return override
    if (!categories.length) return index === OTHER_QUADRANT ? 'Other' : ''
    const label = categories.length === 1 ? categories[0] : `${categories[0]} (+${categories.length - 1})`
    return index === OTHER_QUADRANT ? `${label} · Other` : label
  })
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

      for (const [index, value] of cell.values.entries()) {
        const ring = statusRank(value.status)
        if (ring === -1) {
          withoutStatus.push({ key: row.key, name: row.name, projectId, origin: value.origin })
          continue
        }
        const quadrant = quadrants.has(value.origin.categoryTitle)
          ? Number(quadrants.get(value.origin.categoryTitle))
          : OTHER_QUADRANT
        rowPoints.push({
          // Identifies this one take across layout and conflict lines, so a line
          // is drawn between the very points that were placed, not between a
          // second guess at where they went.
          id: `${row.key}::${projectId}::${index}`,
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

/**
 * Quadrant angle ranges in SVG radians (y down, positive is clockwise), in the
 * same arrangement the project radar uses:
 *
 *   Q0 top-right   Q1 top-left   Q2 bottom-left   Q3 bottom-right
 *
 * The overlay has to agree with the single-project radar here. Reading the same
 * category in the top-left corner of one chart and the bottom-right of the other
 * is enough on its own to make the overlay look like it shows something else.
 */
export const OVERLAY_QUADRANT_ANGLES = [
  { a1: -Math.PI / 2, a2: 0 },
  { a1: -Math.PI, a2: -Math.PI / 2 },
  { a1: Math.PI / 2, a2: Math.PI },
  { a1: 0, a2: Math.PI / 2 }
]

const SECTOR_MARGIN = 0.12
const MAX_ROWS_PER_BAND = 3
const POINTS_PER_ROW = 8

/**
 * Turns overlay points into chart coordinates.
 *
 * The placement is a function of the data alone: points are bucketed by
 * quadrant and ring, sorted by name and project, then spread evenly across
 * their sector. The previous placement derived the angle from the array index,
 * so the same blip moved whenever an unrelated row appeared — which made the
 * chart impossible to read twice the same way.
 *
 * @returns {{ center: number, points: Array, segments: Array, rings: Array, quadrants: Array }}
 */
export function layoutRadarOverlay(overlay, { size = 420, radius = 170 } = {}) {
  const center = size / 2
  const band = radius / STATUS_SCALE.length
  const buckets = new Map()

  for (const point of overlay?.points || []) {
    const bucketKey = `${point.quadrant}|${point.ring}`
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, [])
    buckets.get(bucketKey).push(point)
  }

  const positions = new Map()
  const points = []

  for (const bucket of buckets.values()) {
    const ordered = [...bucket].sort(
      (a, b) => a.name.localeCompare(b.name) || a.projectId.localeCompare(b.projectId) || a.id.localeCompare(b.id)
    )
    const { a1, a2 } = OVERLAY_QUADRANT_ANGLES[ordered[0].quadrant] || OVERLAY_QUADRANT_ANGLES[OTHER_QUADRANT]
    const rows = Math.min(MAX_ROWS_PER_BAND, Math.ceil(ordered.length / POINTS_PER_ROW))
    const columns = Math.ceil(ordered.length / rows)
    const from = a1 + SECTOR_MARGIN
    const to = a2 - SECTOR_MARGIN

    ordered.forEach((point, index) => {
      const row = index % rows
      const column = Math.floor(index / rows)
      const angle = from + (to - from) * ((column + 0.5) / columns)
      const pointRadius = band * point.ring + band / 2 + (row - (rows - 1) / 2) * band * 0.3
      const placed = {
        ...point,
        x: center + pointRadius * Math.cos(angle),
        y: center + pointRadius * Math.sin(angle)
      }
      positions.set(point.id, placed)
      points.push(placed)
    })
  }

  const segments = []
  for (const conflict of overlay?.conflicts || []) {
    const placed = conflict.points.map((point) => positions.get(point.id)).filter(Boolean)
    for (let index = 0; index < placed.length - 1; index++) {
      segments.push({
        key: conflict.key,
        kind: conflict.kind,
        x1: placed[index].x,
        y1: placed[index].y,
        x2: placed[index + 1].x,
        y2: placed[index + 1].y
      })
    }
  }

  const rings = STATUS_LABELS.map((label, index) => ({
    label,
    outer: band * (index + 1),
    // The label sits in the middle of its band on the upward axis, where the
    // project radar puts it too.
    labelY: center - (band * index + band / 2)
  }))

  const quadrantCorners = [
    { x: center + radius - 4, y: center - radius + 12, anchor: 'end' },
    { x: center - radius + 4, y: center - radius + 12, anchor: 'start' },
    { x: center - radius + 4, y: center + radius - 4, anchor: 'start' },
    { x: center + radius - 4, y: center + radius - 4, anchor: 'end' }
  ]

  return { center, radius, points, segments, rings, quadrantCorners }
}
