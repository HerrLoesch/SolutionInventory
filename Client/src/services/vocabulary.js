// The workspace vocabulary: a resolution layer laid *over* the free-text
// answers and radar blips, never a migration of them. A term carries a stable
// id, a canonical display name, a mandatory kind and a list of aliases; two
// blips are "the same thing" exactly when they resolve to the same term id.
//
// Pure functions only — no Pinia, no Vue, same contract as workspaceFactories.js.
// Everything here operates on plain arrays so it stays trivially testable and
// usable from the store, the comparison engine and the migrations alike.
//
// Data model (workspace.vocabulary[]):
//   { id, name, kind: 'tool' | 'practice', aliases: string[], note, createdAt }
//
// Invariants:
//   - An alias belongs to at most one term (see buildAliasIndex).
//   - normalize(name) counts as an implicit alias and is never stored twice.
//   - Renaming changes `name`, never `id` — blips, overrides and exports stay valid.

export const TERM_KINDS = ['tool', 'practice']

/**
 * The single normalization used everywhere a raw name is compared: trimmed,
 * lower-cased, inner whitespace runs collapsed to one space. Non-string input
 * (null, undefined, numbers) normalizes to '' rather than throwing — raw names
 * come from user data and are not guaranteed to be strings.
 */
export function normalize(value) {
  if (typeof value !== 'string') {
    if (value === null || value === undefined) return ''
    value = String(value)
  }
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * True when both raw names normalize to the same non-empty string. Two empty
 * names are deliberately *not* "the same term" — an empty name has no identity.
 */
export function isSameName(a, b) {
  const normalized = normalize(a)
  return normalized !== '' && normalized === normalize(b)
}

/**
 * Every normalized key a term answers to: its own normalized name plus every
 * normalized alias, deduplicated. The name counts as an implicit alias, which
 * is why callers never store it in `aliases` as well (design §3.1).
 */
export function termKeys(term) {
  const keys = []
  const seen = new Set()
  const push = (raw) => {
    const key = normalize(raw)
    if (key === '' || seen.has(key)) return
    seen.add(key)
    keys.push(key)
  }
  push(term?.name)
  const aliases = Array.isArray(term?.aliases) ? term.aliases : []
  aliases.forEach(push)
  return keys
}

/**
 * Builds the normalized-key -> term lookup for one vocabulary. Built fresh per
 * call rather than cached: the vocabulary is small, and a stale index would be
 * a far more expensive bug than a rebuild.
 *
 * Enforces the "an alias belongs to at most one term" invariant by *reporting*
 * collisions instead of letting the last writer win. Silently overwriting would
 * make the comparison key depend on array order, so two terms would swap
 * identities on a reorder that looks harmless. The index is still returned with
 * the first claimant kept, so a workspace with a collision stays usable and the
 * user can be shown what to resolve.
 *
 * @returns {{ index: Map<string, object>, collisions: Array<{key, termId, conflictingTermId}> }}
 */
export function buildAliasIndex(vocabulary) {
  const terms = Array.isArray(vocabulary) ? vocabulary : []
  const index = new Map()
  const collisions = []
  for (const term of terms) {
    if (!term || !term.id) continue
    for (const key of termKeys(term)) {
      const owner = index.get(key)
      if (owner) {
        if (owner.id !== term.id) {
          collisions.push({ key, termId: owner.id, conflictingTermId: term.id })
        }
        continue
      }
      index.set(key, term)
    }
  }
  return { index, collisions }
}

/**
 * The defined failure for every write path that would break the "an alias
 * belongs to at most one term" invariant. A distinct class rather than a plain
 * Error so callers can tell a rejected merge from an unexpected crash and show
 * the user which key collided with which term.
 */
export class AliasCollisionError extends Error {
  constructor(collisions) {
    const keys = collisions.map((collision) => `"${collision.key}"`).join(', ')
    super(`alias collision: ${keys} claimed by more than one term`)
    this.name = 'AliasCollisionError'
    this.collisions = collisions
  }
}

/**
 * Guard for write paths (create, rename, add alias, merge). Read paths use
 * buildAliasIndex directly and keep working with the first claimant, because a
 * workspace that somehow acquired a collision must stay openable. A *write*,
 * however, must not be the step that introduces one — it either succeeds
 * cleanly or fails with a defined error the caller can present.
 *
 * @throws {AliasCollisionError}
 */
export function assertNoAliasCollisions(vocabulary) {
  const { collisions } = buildAliasIndex(vocabulary)
  if (collisions.length > 0) throw new AliasCollisionError(collisions)
}

/**
 * Resolves a raw name (a radar blip's `option` or an answer's `technology`) to
 * its term, or null when the vocabulary does not know it. An unresolved name is
 * a defined state, not an error: the comparison keeps carrying it under its raw
 * text and marks it, so the worst case degrades to plain text matching.
 *
 * Accepts either a vocabulary array or a prebuilt index, so a caller looping
 * over thousands of blips can build the index once.
 */
export function resolve(rawName, vocabularyOrIndex) {
  const key = normalize(rawName)
  if (key === '') return null
  const index = vocabularyOrIndex instanceof Map ? vocabularyOrIndex : buildAliasIndex(vocabularyOrIndex).index
  return index.get(key) || null
}

// ── Similarity (suggestions only, never automatic matching) ──────────────────
//
// Thresholds are taken over unchanged from MCP/McpServer/Logic/DataConsistencyAnalyzer.cs,
// where the same problem (near-duplicate technology names) is already solved and
// already tuned against false alarms. Same product, same problem — reinventing
// the calibration would mean re-earning it.
//
//   distance 1  counts from 5 characters
//   distance 2  counts from 8 characters
//
// That rule alone is not enough here: the leading example from the design,
// ".net core" vs "dotnet core", sits at edit distance 3 and would be missed. The
// token rule below is what actually covers the main case, so it is mandatory,
// not decoration.
//
// Nothing here ever assigns anything. A suggestion becomes real only when a
// person confirms it, and is then recorded as an alias instead of being guessed
// again on every comparison (design §3.2).

const MIN_NEAR_DUPLICATE_LENGTH = 5
const DISTANCE_2_MIN_LENGTH = 8
const MIN_CONTAINMENT_LENGTH = 3
const MIN_CONTAINMENT_LENGTH_DIFFERENCE = 2
const MAX_CONTAINMENT_LENGTH_DIFFERENCE = 3

/** Classic Levenshtein edit distance, two rolling rows. */
export function levenshtein(a, b) {
  const left = String(a ?? '')
  const right = String(b ?? '')
  if (left === right) return 0
  if (left.length === 0) return right.length
  if (right.length === 0) return left.length

  let previous = new Array(right.length + 1)
  let current = new Array(right.length + 1)
  for (let j = 0; j <= right.length; j++) previous[j] = j

  for (let i = 1; i <= left.length; i++) {
    current[0] = i
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost)
    }
    const swap = previous
    previous = current
    current = swap
  }
  return previous[right.length]
}

/**
 * Splits a normalized name into comparison tokens. Punctuation separates rather
 * than being deleted, so ".net core" and "azure-devops" break into the same
 * shape as their spaced spellings.
 */
export function tokenize(rawName) {
  return normalize(rawName)
    .split(/[^a-z0-9]+/)
    .filter((token) => token !== '')
}

/** The calibrated near-duplicate rule from the MCP analyzer, applied to two keys. */
function isNearDuplicate(a, b) {
  const shorter = Math.min(a.length, b.length)
  if (shorter < MIN_NEAR_DUPLICATE_LENGTH) return false
  const distance = levenshtein(a, b)
  return distance === 1 || (distance === 2 && shorter >= DISTANCE_2_MIN_LENGTH)
}

/**
 * Whether two single tokens plausibly denote the same thing: identical, one
 * contained in the other, or a near duplicate by the rule above.
 *
 * Containment is deliberately narrow: the shorter token must be at least 3
 * characters and the length difference must be between 2 and 3. That admits
 * "net" ⊂ "dotnet" (the case this rule exists for) while rejecting both
 * "java" ⊂ "javascript" (too far apart) and "vue" ⊂ "vuex" (too close — a
 * one-character extension is a different word, which is exactly why the
 * Levenshtein rule above refuses distance 1 below 5 characters).
 */
function tokensMatch(a, b) {
  if (a === b) return true
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  if (
    shorter.length >= MIN_CONTAINMENT_LENGTH &&
    longer.length - shorter.length >= MIN_CONTAINMENT_LENGTH_DIFFERENCE &&
    longer.length - shorter.length <= MAX_CONTAINMENT_LENGTH_DIFFERENCE &&
    longer.includes(shorter)
  ) {
    return true
  }
  return isNearDuplicate(a, b)
}

/**
 * Token-overlap rule: same number of tokens, and every token of one name pairs
 * with a distinct token of the other.
 *
 * Requiring equal token counts is what keeps this quiet. Allowing a name to
 * match a longer one would make "Java" a suggestion for "Java Script" and
 * "Redis" one for "Redis Cache" — different things, offered on every screen.
 */
export function tokensOverlap(a, b) {
  const left = tokenize(a)
  const right = tokenize(b)
  if (left.length === 0 || left.length !== right.length) return false

  const unmatched = [...right]
  for (const token of left) {
    const index = unmatched.findIndex((candidate) => tokensMatch(token, candidate))
    if (index === -1) return false
    unmatched.splice(index, 1)
  }
  return true
}

/**
 * Whether two raw names are similar enough to *suggest* to a user. Two names
 * that normalize identically are the same name, not a suggestion, so they are
 * excluded — the caller resolves those exactly.
 *
 * @returns {{ similar: boolean, reason: 'levenshtein'|'tokens'|'', distance: number }}
 */
export function compareNames(a, b) {
  const left = normalize(a)
  const right = normalize(b)
  if (left === '' || right === '' || left === right) {
    return { similar: false, reason: '', distance: left === right ? 0 : Infinity }
  }
  const distance = levenshtein(left, right)
  if (isNearDuplicate(left, right)) return { similar: true, reason: 'levenshtein', distance }
  if (tokensOverlap(left, right)) return { similar: true, reason: 'tokens', distance }
  return { similar: false, reason: '', distance }
}

/**
 * Terms whose name or one of whose aliases resembles `rawName`, best first.
 * Returns [] for a name the vocabulary already resolves exactly — there is
 * nothing to suggest when the answer is known.
 *
 * @returns {Array<{ term: object, matchedKey: string, reason: string, distance: number }>}
 */
export function findSimilarTerms(rawName, vocabulary, { limit = 5 } = {}) {
  const key = normalize(rawName)
  if (key === '') return []
  const terms = Array.isArray(vocabulary) ? vocabulary : []
  if (resolve(key, terms)) return []

  const suggestions = []
  for (const term of terms) {
    if (!term || !term.id) continue
    let best = null
    for (const candidateKey of termKeys(term)) {
      const { similar, reason, distance } = compareNames(key, candidateKey)
      if (!similar) continue
      if (!best || distance < best.distance) best = { term, matchedKey: candidateKey, reason, distance }
    }
    if (best) suggestions.push(best)
  }

  return suggestions.sort((a, b) => a.distance - b.distance || a.term.name.localeCompare(b.term.name)).slice(0, limit)
}
