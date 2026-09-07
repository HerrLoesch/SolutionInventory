import { describe, it, expect } from 'vitest'
import { normalize, isSameName, TERM_KINDS } from '../../src/services/vocabulary'

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
