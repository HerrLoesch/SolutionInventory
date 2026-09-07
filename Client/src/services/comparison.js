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
import { normalize } from './vocabulary'

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
