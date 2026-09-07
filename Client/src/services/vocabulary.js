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
