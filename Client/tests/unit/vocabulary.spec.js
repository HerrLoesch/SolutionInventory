import { describe, it, expect } from 'vitest'
import {
  normalize,
  isSameName,
  TERM_KINDS,
  termKeys,
  buildAliasIndex,
  resolve,
  assertNoAliasCollisions,
  AliasCollisionError,
  levenshtein,
  tokenize,
  tokensOverlap,
  compareNames,
  findSimilarTerms
} from '../../src/services/vocabulary'

describe('normalize', () => {
  it('lower-cases and trims', () => {
    expect(normalize('  .NET Core  ')).toBe('.net core')
  })

  it('collapses inner whitespace runs to a single space', () => {
    expect(normalize('Azure   DevOps')).toBe('azure devops')
    expect(normalize('Azure\tDev\nOps')).toBe('azure dev ops')
  })

  it('is idempotent', () => {
    const once = normalize('  Clean   ARCHITECTURE ')
    expect(normalize(once)).toBe(once)
  })

  it('maps empty and whitespace-only input to an empty string', () => {
    expect(normalize('')).toBe('')
    expect(normalize('   ')).toBe('')
    expect(normalize('\n\t ')).toBe('')
  })

  it('tolerates non-string input instead of throwing — raw names come from user data', () => {
    expect(normalize(null)).toBe('')
    expect(normalize(undefined)).toBe('')
    expect(normalize(42)).toBe('42')
  })

  it('leaves punctuation alone — ".net core" and "dotnet core" stay different strings', () => {
    expect(normalize('.NET Core')).toBe('.net core')
    expect(normalize('Dotnet Core')).toBe('dotnet core')
    expect(normalize('.NET Core')).not.toBe(normalize('Dotnet Core'))
  })
})

describe('isSameName', () => {
  it('matches names that differ only in case and spacing', () => {
    expect(isSameName('Azure  DevOps', 'azure devops')).toBe(true)
  })

  it('does not match two empty names — an empty name has no identity', () => {
    expect(isSameName('', '')).toBe(false)
    expect(isSameName('   ', null)).toBe(false)
  })

  it('does not match different names', () => {
    expect(isSameName('Redis', 'Redux')).toBe(false)
  })
})

describe('TERM_KINDS', () => {
  it('holds exactly the two kinds a term may carry, lower-cased', () => {
    expect(TERM_KINDS).toEqual(['tool', 'practice'])
  })
})

function term(id, name, aliases = [], kind = 'tool') {
  return { id, name, kind, aliases }
}

describe('termKeys', () => {
  it('includes the normalized name as an implicit alias', () => {
    expect(termKeys(term('t1', '.NET Core', ['dotnet core']))).toEqual(['.net core', 'dotnet core'])
  })

  it('deduplicates an alias that repeats the name', () => {
    expect(termKeys(term('t1', '.NET Core', ['.net core', 'dotnet core']))).toEqual(['.net core', 'dotnet core'])
  })

  it('drops empty and whitespace-only aliases', () => {
    expect(termKeys(term('t1', 'Redis', ['', '   ', 'redis-cache']))).toEqual(['redis', 'redis-cache'])
  })

  it('tolerates a term without an alias array', () => {
    expect(termKeys({ id: 't1', name: 'Redis' })).toEqual(['redis'])
  })

  it('returns nothing for a nameless term with no aliases', () => {
    expect(termKeys({ id: 't1', name: '' })).toEqual([])
  })
})

describe('buildAliasIndex', () => {
  it('maps every name and alias to its term', () => {
    const vocabulary = [term('t1', '.NET Core', ['dotnet core', 'netcore']), term('t2', 'Redis')]
    const { index, collisions } = buildAliasIndex(vocabulary)

    expect(collisions).toEqual([])
    expect(index.get('.net core').id).toBe('t1')
    expect(index.get('dotnet core').id).toBe('t1')
    expect(index.get('netcore').id).toBe('t1')
    expect(index.get('redis').id).toBe('t2')
  })

  it('normalizes keys, so a sloppily written alias is still found', () => {
    const { index } = buildAliasIndex([term('t1', '  Azure   DevOps ', ['  ADO  '])])

    expect(index.get('azure devops').id).toBe('t1')
    expect(index.get('ado').id).toBe('t1')
  })

  it('returns an empty index for an empty, missing or non-array vocabulary', () => {
    expect(buildAliasIndex([]).index.size).toBe(0)
    expect(buildAliasIndex(undefined).index.size).toBe(0)
    expect(buildAliasIndex('nope').index.size).toBe(0)
  })

  it('skips entries without an id instead of indexing them', () => {
    const { index } = buildAliasIndex([{ name: 'Ghost', aliases: [] }, term('t1', 'Redis')])

    expect(index.has('ghost')).toBe(false)
    expect(index.get('redis').id).toBe('t1')
  })

  it('tolerates the same key listed twice on one term without reporting a collision', () => {
    const { collisions } = buildAliasIndex([term('t1', 'Redis', ['redis', 'Redis'])])

    expect(collisions).toEqual([])
  })
})

// Invariant from design §3.1: an alias belongs to at most one term. A collision
// must be *reported*, never silently resolved by array order — otherwise two
// terms swap identities when the vocabulary is merely reordered.
describe('buildAliasIndex — alias collisions', () => {
  it('reports an alias claimed by two different terms', () => {
    const { collisions } = buildAliasIndex([
      term('t1', '.NET Core', ['netcore']),
      term('t2', '.NET Framework', ['netcore'])
    ])

    expect(collisions).toEqual([{ key: 'netcore', termId: 't1', conflictingTermId: 't2' }])
  })

  it("reports a collision between one term's name and another term's alias", () => {
    const { collisions } = buildAliasIndex([term('t1', 'Redis'), term('t2', 'Cache', ['redis'])])

    expect(collisions).toEqual([{ key: 'redis', termId: 't1', conflictingTermId: 't2' }])
  })

  it('reports two terms sharing a name that differs only in case and spacing', () => {
    const { collisions } = buildAliasIndex([term('t1', 'Azure DevOps'), term('t2', '  azure   devops ')])

    expect(collisions).toEqual([{ key: 'azure devops', termId: 't1', conflictingTermId: 't2' }])
  })

  it('keeps the first claimant so a colliding vocabulary stays usable', () => {
    const { index, collisions } = buildAliasIndex([
      term('t1', '.NET Core', ['netcore']),
      term('t2', '.NET Framework', ['netcore'])
    ])

    expect(collisions).toHaveLength(1)
    expect(index.get('netcore').id).toBe('t1')
    expect(index.get('.net framework').id).toBe('t2')
  })

  it('reports every colliding key, not just the first', () => {
    const { collisions } = buildAliasIndex([term('t1', 'A', ['x', 'y']), term('t2', 'B', ['x', 'y'])])

    expect(collisions.map((collision) => collision.key)).toEqual(['x', 'y'])
  })
})

// Write paths must fail loudly rather than produce a colliding vocabulary.
describe('assertNoAliasCollisions', () => {
  it('passes for a vocabulary without collisions', () => {
    expect(() => assertNoAliasCollisions([term('t1', 'Redis'), term('t2', '.NET Core', ['netcore'])])).not.toThrow()
  })

  it('passes for an empty or missing vocabulary', () => {
    expect(() => assertNoAliasCollisions([])).not.toThrow()
    expect(() => assertNoAliasCollisions(undefined)).not.toThrow()
  })

  it('throws a typed error carrying every collision', () => {
    const colliding = [term('t1', 'A', ['x']), term('t2', 'B', ['x'])]

    expect(() => assertNoAliasCollisions(colliding)).toThrow(AliasCollisionError)
    try {
      assertNoAliasCollisions(colliding)
    } catch (error) {
      expect(error.name).toBe('AliasCollisionError')
      expect(error.collisions).toEqual([{ key: 'x', termId: 't1', conflictingTermId: 't2' }])
      expect(error.message).toContain('"x"')
    }
  })
})

describe('resolve', () => {
  const vocabulary = [term('t1', '.NET Core', ['dotnet core', 'netcore']), term('t2', 'Redis')]

  it('resolves by canonical name', () => {
    expect(resolve('.NET Core', vocabulary).id).toBe('t1')
  })

  it('resolves by alias', () => {
    expect(resolve('Dotnet Core', vocabulary).id).toBe('t1')
    expect(resolve('NETCORE', vocabulary).id).toBe('t1')
  })

  it('resolves regardless of case and surrounding or doubled whitespace', () => {
    expect(resolve('  .net   CORE  ', vocabulary).id).toBe('t1')
  })

  it('returns null for a name the vocabulary does not know', () => {
    expect(resolve('Redux', vocabulary)).toBeNull()
  })

  it('returns null for empty, whitespace-only and non-string names', () => {
    expect(resolve('', vocabulary)).toBeNull()
    expect(resolve('   ', vocabulary)).toBeNull()
    expect(resolve(null, vocabulary)).toBeNull()
    expect(resolve(undefined, vocabulary)).toBeNull()
  })

  it('returns null for an empty or missing vocabulary', () => {
    expect(resolve('Redis', [])).toBeNull()
    expect(resolve('Redis', undefined)).toBeNull()
  })

  it('accepts a prebuilt index so a caller can build it once for many lookups', () => {
    const { index } = buildAliasIndex(vocabulary)

    expect(resolve('netcore', index).id).toBe('t1')
    expect(resolve('Redux', index)).toBeNull()
  })
})

describe('levenshtein', () => {
  it('computes the classic edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('abc', 'abc')).toBe(0)
    expect(levenshtein('flaw', 'lawn')).toBe(2)
    expect(levenshtein('kubernets', 'kubernetes')).toBe(1)
  })

  it('is symmetric', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(levenshtein('sitting', 'kitten'))
  })

  it('handles empty and missing input', () => {
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
    expect(levenshtein('', '')).toBe(0)
    expect(levenshtein(null, undefined)).toBe(0)
  })
})

describe('tokenize', () => {
  it('splits on whitespace and punctuation alike', () => {
    expect(tokenize('.NET Core')).toEqual(['net', 'core'])
    expect(tokenize('azure-devops')).toEqual(['azure', 'devops'])
    expect(tokenize('Azure  DevOps')).toEqual(['azure', 'devops'])
  })

  it('drops empty fragments', () => {
    expect(tokenize('  ...  ')).toEqual([])
    expect(tokenize('')).toEqual([])
    expect(tokenize(null)).toEqual([])
  })
})

// The two rules the design demands, checked against the exact pairs named in
// plan §2.1 and §7: the leading example must hit, the counter-example must not.
describe('compareNames', () => {
  it('finds ".net core" ↔ "dotnet core" — the main case, at edit distance 3', () => {
    const result = compareNames('.NET Core', 'dotnet core')

    expect(result.similar).toBe(true)
    expect(result.reason).toBe('tokens')
    expect(result.distance).toBe(3)
  })

  it('does not confuse "Redis" with "Redux"', () => {
    const result = compareNames('Redis', 'Redux')

    expect(result.similar).toBe(false)
    expect(result.distance).toBe(2)
  })

  it('applies the calibrated distance-1 rule only from 5 characters', () => {
    // 9 characters, one insertion — a typo worth flagging.
    expect(compareNames('Kubernets', 'Kubernetes').similar).toBe(true)
    expect(compareNames('Kubernets', 'Kubernetes').reason).toBe('levenshtein')
    // 3 and 4 characters, one edit — too short to tell a typo from a word.
    expect(compareNames('Vue', 'Vuex').similar).toBe(false)
    expect(compareNames('Java', 'Kava').similar).toBe(false)
  })

  it('applies the calibrated distance-2 rule only from 8 characters', () => {
    // 8 characters, distance 2.
    expect(compareNames('Typescript', 'Typscrpt').similar).toBe(true)
    // 5 characters, distance 2 — below the threshold on purpose.
    expect(compareNames('Redis', 'Redux').similar).toBe(false)
  })

  it('flags a distance-1 pair at exactly 5 characters, as the MCP thresholds do', () => {
    // "React" / "Preact" is a single insertion at the calibration boundary. The
    // thresholds are taken over from the MCP analyzer unchanged, so this pair is
    // *suggested* — a human still decides, and nothing is assigned automatically.
    expect(compareNames('React', 'Preact')).toEqual({ similar: true, reason: 'levenshtein', distance: 1 })
  })

  it('matches punctuation and separator variants of the same name', () => {
    expect(compareNames('Azure DevOps', 'azure-devops').similar).toBe(true)
    expect(compareNames('Continuous Delivery', 'continuous  delivery').similar).toBe(false)
  })

  it('does not match a name against a longer one that merely contains it', () => {
    expect(compareNames('Java', 'Java Script').similar).toBe(false)
    expect(compareNames('Redis', 'Redis Cache').similar).toBe(false)
  })

  it('does not match names that only share one of several tokens', () => {
    expect(compareNames('Azure DevOps', 'Azure Pipelines').similar).toBe(false)
    expect(compareNames('Spring Boot', 'Spring Cloud').similar).toBe(false)
  })

  it('reports identical and empty names as not-a-suggestion', () => {
    expect(compareNames('Redis', 'redis').similar).toBe(false)
    expect(compareNames('Redis', '').similar).toBe(false)
    expect(compareNames('', '').similar).toBe(false)
  })
})

describe('tokensOverlap', () => {
  it('matches regardless of token order', () => {
    expect(tokensOverlap('Core .NET', '.net core')).toBe(true)
  })

  it('requires the same number of tokens', () => {
    expect(tokensOverlap('a b', 'a b c')).toBe(false)
  })

  it('returns false for a name without tokens', () => {
    expect(tokensOverlap('...', 'redis')).toBe(false)
  })
})

describe('findSimilarTerms', () => {
  const vocabulary = [
    term('t1', '.NET Core', ['netcore']),
    term('t2', 'Redis'),
    term('t3', 'Kubernetes'),
    term('t4', 'Azure DevOps')
  ]

  it('suggests the term behind a different spelling', () => {
    const [suggestion] = findSimilarTerms('dotnet core', vocabulary)

    expect(suggestion.term.id).toBe('t1')
    expect(suggestion.reason).toBe('tokens')
  })

  it('suggests via an alias, and reports which key matched', () => {
    const [suggestion] = findSimilarTerms('netcore2', vocabulary)

    expect(suggestion.term.id).toBe('t1')
    expect(suggestion.matchedKey).toBe('netcore')
  })

  it('suggests nothing for a name the vocabulary already resolves', () => {
    expect(findSimilarTerms('.NET Core', vocabulary)).toEqual([])
    expect(findSimilarTerms('NETCORE', vocabulary)).toEqual([])
  })

  it('suggests nothing for an unrelated name', () => {
    expect(findSimilarTerms('Redux', vocabulary)).toEqual([])
    expect(findSimilarTerms('PostgreSQL', vocabulary)).toEqual([])
  })

  it('suggests nothing for an empty name or an empty vocabulary', () => {
    expect(findSimilarTerms('', vocabulary)).toEqual([])
    expect(findSimilarTerms('   ', vocabulary)).toEqual([])
    expect(findSimilarTerms('dotnet core', [])).toEqual([])
    expect(findSimilarTerms('dotnet core', undefined)).toEqual([])
  })

  it('orders the closest suggestion first', () => {
    const withTwo = [term('t1', 'Kubrnets'), term('t2', 'Kubernets')]
    const suggestions = findSimilarTerms('Kubernetes', withTwo)

    // distance 1 before distance 2.
    expect(suggestions.map((suggestion) => suggestion.term.id)).toEqual(['t2', 't1'])
    expect(suggestions.map((suggestion) => suggestion.distance)).toEqual([1, 2])
  })

  it('breaks a distance tie by name, so the order is stable', () => {
    const tied = [term('t1', 'Kubernets'), term('t2', 'Kubernete')]

    expect(findSimilarTerms('Kubernetes', tied).map((suggestion) => suggestion.term.name)).toEqual([
      'Kubernete',
      'Kubernets'
    ])
  })

  it('honors the limit', () => {
    const many = [term('t1', 'Kubernets'), term('t2', 'Kubernete'), term('t3', 'Kubrnets')]

    expect(findSimilarTerms('Kubernetes', many, { limit: 2 })).toHaveLength(2)
  })
})
