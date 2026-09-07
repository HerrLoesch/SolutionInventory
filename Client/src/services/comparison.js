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
