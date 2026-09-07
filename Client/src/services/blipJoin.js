// The join between a project's radar entries and the questionnaire answers they
// came from. Extracted verbatim from TechRadar.vue rather than written a second
// time: the comparison engine needs exactly this derivation, and two copies of
// it would drift apart the first time either side is touched.
//
// Pure functions — no Pinia, no Vue. The component passes in the questionnaires
// it already resolved through the store.

import { resolve } from './vocabulary'

/**
 * Builds `entryId -> { categoryTitle, entryTitle, candidates[] }` over a
 * project's questionnaires. Metadata categories are skipped; they describe the
 * solution, not its technology choices.
 *
 * A `candidate` is one answer with the questionnaire it came from, kept so the
 * caller can tell which questionnaire an answer belongs to (DE-3: the same name
 * may appear under several entries and across questionnaires).
 */
export function buildEntryLookup(questionnaires) {
  const lookup = new Map()
  if (!Array.isArray(questionnaires)) return lookup

  for (const questionnaire of questionnaires) {
    const categories = questionnaire?.categories
    if (!Array.isArray(categories)) continue

    for (const category of categories) {
      if (category?.isMetadata) continue

      const categoryTitle = String(category?.title || '').trim()
      const entries = category?.entries
      if (!Array.isArray(entries)) continue

      for (const entry of entries) {
        const entryId = String(entry?.id || '').trim()
        if (!entryId) continue

        const entryTitle = String(entry?.aspect || entry?.title || entryId).trim()
        if (!lookup.has(entryId)) {
          lookup.set(entryId, { categoryTitle, entryTitle, candidates: [] })
        }

        const entryData = lookup.get(entryId)
        const answers = entry?.answers
        if (!Array.isArray(answers)) continue

        for (const answer of answers) {
          const technology = String(answer?.technology || '').trim()
          if (!technology) continue

          entryData.candidates.push({
            tech: technology,
            answer,
            questionnaireName: questionnaire.name || questionnaire.id,
            questionnaireId: questionnaire.id
          })
        }
      }
    }
  }
  return lookup
}

/**
 * The answer a radar entry refers to, matched on entryId plus a case-insensitive
 * name comparison between `option` and `technology`. Returns null when the entry
 * or the answer has since been deleted — a defined state, not an error.
 */
export function findMatchingCandidate(entry, lookup) {
  const normalized = String(entry?.option || '')
    .trim()
    .toLowerCase()
  const candidates = lookup?.get?.(String(entry?.entryId || ''))?.candidates || []
  return candidates.find((candidate) => candidate.tech.toLowerCase() === normalized) || null
}

/**
 * Derives the fields a radar entry inherits from its answer.
 *
 * `effectiveStatus = entry.status || answer.status` — a blip without a curated
 * status inherits the answer's. Only when *both* are empty is the blip genuinely
 * unassessed, which is what `⊘ unset` means in the comparison (DE-7). Building
 * that on `entry.status` alone would report assessed blips as unrated.
 */
export function deriveBlipJoin(entry, lookup) {
  const match = findMatchingCandidate(entry, lookup)
  const entryData = lookup?.get?.(String(entry?.entryId || '')) || null
  const answer = match?.answer

  const answerStatus = String(answer?.status || '').trim()
  const answerCategory = entryData?.categoryTitle || ''
  const entryStatus = String(entry?.status || '').trim()
  const entryCategory = String(entry?.category || '').trim()

  return {
    answer: answer || null,
    answerType: String(answer?.answerType || '').trim(),
    answerStatus,
    naturalCategoryTitle: answerCategory,
    entryTitle: entryData?.entryTitle || '',
    questionnaireName: match?.questionnaireName || '',
    questionnaireId: match?.questionnaireId || '',
    effectiveStatus: entryStatus || answerStatus,
    effectiveCategory: entryCategory || answerCategory,
    // "Has a user override" markers driving the pencil icon in the radar.
    overrideStatus: entryStatus && entryStatus !== answerStatus ? entryStatus : '',
    overrideCategoryTitle: entryCategory && entryCategory !== answerCategory ? entryCategory : ''
  }
}

/**
 * The kind of a name, in the precedence fixed by DE-11:
 *   1. the resolved term's `kind`   — the only source for a resolved term
 *   2. the answer's `answerType`    — a fallback for names not in the vocabulary
 *   3. 'unassigned'
 *
 * Note the two spellings: `answerType` is 'Tool' / 'Practice', `kind` is
 * 'tool' / 'practice'. The mapping is a toLowerCase(); every other value, empty
 * included, is 'unassigned'. `⬚ unassigned` (kind unknown) and `◌` (not resolved)
 * are different things — a resolved term is never `⬚`, because kind is mandatory
 * on a term.
 */
export function deriveKind(rawName, answerType, vocabularyOrIndex) {
  const term = resolve(rawName, vocabularyOrIndex)
  if (term && (term.kind === 'tool' || term.kind === 'practice')) return term.kind

  const fromAnswer = String(answerType || '')
    .trim()
    .toLowerCase()
  if (fromAnswer === 'tool' || fromAnswer === 'practice') return fromAnswer

  return 'unassigned'
}
