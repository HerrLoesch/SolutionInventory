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
