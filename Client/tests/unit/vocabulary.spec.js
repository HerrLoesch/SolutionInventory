import { describe, it, expect } from 'vitest'
import {
  normalize,
  isSameName,
  TERM_KINDS,
  termKeys,
  buildAliasIndex,
  resolve,
  assertNoAliasCollisions,
  AliasCollisionError
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
