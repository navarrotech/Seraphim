// Copyright © 2026 Jalapeno Labs

// Core
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Lib to test
import { GithubCloner } from './github.js'

describe('GithubCloner', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
  })

  afterEach(() => {
    debugSpy.mockRestore()
  })

  it('builds a clone URL without a token', () => {
    const cloner = new GithubCloner('navarrotech/Seraphim')

    expect(cloner.getCloneUrl()).toBe('https://github.com/navarrotech/Seraphim.git')
  })

  it('builds a clone URL with a token', () => {
    const cloner = new GithubCloner('navarrotech/Seraphim', 'token-value')

    expect(cloner.getCloneUrl()).toBe(
      'https://x-access-token:token-value@github.com/navarrotech/Seraphim.git',
    )
  })

  it('trims the token and repository values', () => {
    const cloner = new GithubCloner(' navarrotech/Seraphim ', '  token-value  ')

    expect(cloner.getCloneUrl()).toBe(
      'https://x-access-token:token-value@github.com/navarrotech/Seraphim.git',
    )
  })
})
