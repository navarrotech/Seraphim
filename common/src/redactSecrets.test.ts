// Copyright © 2026 Jalapeno Labs

// Core
import { describe, expect, it } from 'vitest'

// Lib to test
import { redactSecrets } from './redactSecrets'

describe('redactSecrets', () => {
  it('replaces every occurrence of a secret with the requested mask length', () => {
    const message = 'token=shh token=shh'

    const redacted = redactSecrets(message, [ 'shh' ], 4)

    expect(redacted).toBe('token=**** token=****')
  })

  it('handles overlapping secrets by masking the longer secret first', () => {
    const message = 'abc ab abc'

    const redacted = redactSecrets(message, [ 'ab', 'abc' ], 2)

    expect(redacted).toBe('** ** **')
  })

  it('escapes regex characters inside secrets', () => {
    const message = 'token a.*b token'

    const redacted = redactSecrets(message, [ 'a.*b' ], 5)

    expect(redacted).toBe('token ***** token')
  })

  it('defaults to an 8-character mask when the mask length is not valid', () => {
    const message = 'secret'

    const redacted = redactSecrets(message, [ 'secret' ], Number.NaN)

    expect(redacted).toBe('********')
  })

  it('returns the message unchanged when there are no secrets', () => {
    const message = 'nothing to redact'

    const redacted = redactSecrets(message, [])

    expect(redacted).toBe(message)
  })
})
