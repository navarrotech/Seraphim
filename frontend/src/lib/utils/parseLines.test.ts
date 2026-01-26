// Copyright © 2026 Jalapeno Labs

// Core
import { describe, expect, it } from 'vitest'

// Misc
import { parseLines } from './parseLines'

describe('parseLines', () => {
  it('returns an empty array for empty input', () => {
    expect(parseLines('')).toEqual([])
  })

  it('trims whitespace and skips blank lines', () => {
    expect(parseLines(' one \n\n two \n  \nthree ')).toEqual([ 'one', 'two', 'three' ])
  })

  it('handles Windows newlines', () => {
    expect(parseLines('alpha\r\nbeta\r\ngamma')).toEqual([ 'alpha', 'beta', 'gamma' ])
  })
})
