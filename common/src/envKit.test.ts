// Copyright © 2026 Jalapeno Labs

// Core
import { describe, expect, expectTypeOf, it } from 'vitest'

// Misc
import { parseEnvBool, parseEnvInt, parseEnvNumber } from './envKit'

describe('parseEnvInt', () => {
  it('returns the default when the value is missing', () => {
    const result = parseEnvInt(undefined, 42)
    expect(result).toBe(42)
  })

  it('trims and parses integer strings', () => {
    const result = parseEnvInt('  101 ', 0)
    expect(result).toBe(101)
  })

  it('returns the default for non-numeric values', () => {
    const result = parseEnvInt('not-a-number', 7)
    expect(result).toBe(7)
  })

  it('parses the integer portion of decimal strings', () => {
    const result = parseEnvInt('12.8', 0)
    expect(result).toBe(12)
  })

  it('returns integers parsed from decimal strings', () => {
    const result = parseEnvInt('9.1', 0)
    expect(result).toBe(9)
  })

  it('has a number return type', () => {
    const result = parseEnvInt('3', 0)
    expectTypeOf(result).toEqualTypeOf<number>()
    result satisfies number
  })
})

describe('parseEnvNumber', () => {
  it('returns the default when the value is missing', () => {
    const result = parseEnvNumber(undefined, 3)
    expect(result).toBe(3)
  })

  it('trims and parses numeric strings', () => {
    const result = parseEnvNumber('  54 ', 0)
    expect(result).toBe(54)
  })

  it('returns the default for non-numeric values', () => {
    const result = parseEnvNumber('nope', 8)
    expect(result).toBe(8)
  })

  it('returns integers parsed from decimal strings', () => {
    const result = parseEnvNumber('6.6', 0)
    expect(result).toBe(6)
  })

  it('has a number return type', () => {
    const result = parseEnvNumber('4', 0)
    expectTypeOf(result).toEqualTypeOf<number>()
    result satisfies number
  })
})

describe('parseEnvBool', () => {
  it('returns the default when the value is missing', () => {
    const result = parseEnvBool(undefined, true)
    expect(result).toBe(true)
  })

  it('returns true for truthy values (case-insensitive)', () => {
    const truthyValues = [ 'true', '1', 'y', 'yes', 'on', 'TRUE', 'YeS' ]
    const results = truthyValues.map((value) => parseEnvBool(value, false))
    expect(results).toEqual([ true, true, true, true, true, true, true ])
  })

  it('returns false for other values', () => {
    const result = parseEnvBool('false', true)
    expect(result).toBe(false)
  })

  it('has a boolean return type', () => {
    const result = parseEnvBool('true', false)
    expectTypeOf(result).toEqualTypeOf<boolean>()
    result satisfies boolean
  })
})
