// Copyright © 2026 Jalapeno Labs

// Lib
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

// Utility
import { stringify } from './stringify'

describe('stringify', () => {
  let consoleErrorMock: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.restoreAllMocks()
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('returns an empty string when called with no values', () => {
    const result = stringify()

    expect(result).toBe('')
  })

  it('skips null and undefined values and trims the final output', () => {
    const result = stringify('alpha', undefined, null, 'beta')

    expect(result).toBe('alpha beta')
  })

  it('stringifies primitive values in order', () => {
    const result = stringify(1, true, 'done')

    expect(result).toBe('1 true done')
    expectTypeOf(result).toEqualTypeOf<string>()
    result satisfies string
  })

  it('formats Error values with name, message, and stack', () => {
    const error = new Error('Boom')
    error.name = 'CustomError'
    error.stack = 'StackTraceHere'

    const result = stringify(error)

    expect(result).toBe('Error: CustomError - Boom Stack: StackTraceHere')
  })

  it('stringifies objects with 2-space indentation', () => {
    const result = stringify({ alpha: 1 })

    expect(result).toBe('{\n  "alpha": 1\n}')
  })

  it('logs and returns the error when JSON.stringify throws', () => {
    const circular: { self?: unknown } = {}
    circular.self = circular

    const result = stringify(circular)

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Error stringifying object:',
      expect.any(TypeError),
    )
    expect(result).toMatch(/^TypeError: Converting circular structure to JSON/)
  })
})
