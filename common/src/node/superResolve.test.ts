// Copyright © 2026 Jalapeno Labs

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Node.js
import { resolve } from 'node:path'

// Lib to test
import { superResolve, expandEnvString } from './superResolve.js'

const fakeHomedir = '/home/testuser'

// Mock out homedir so tests are deterministic
vi.mock('node:os', () => ({
  homedir: vi.fn(() => fakeHomedir),
}))

describe('superResolve', () => {
  afterEach(() => {
    vi.resetAllMocks()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('throws if called with no arguments', () => {
    expect(() => superResolve()).toThrowError(
      'superResolve requires at least one path segment',
    )
  })

  it('resolves a normal path without tilde', () => {
    const segments = [ 'folder', 'subfolder' ]
    const expected = resolve(...segments)
    expect(superResolve(...segments)).toBe(expected)
  })

  it('expands "~" by itself to the homedir', () => {
    const result = superResolve('~')
    expect(result).toBe(resolve(fakeHomedir))
  })

  it('expands "~/something" to homedir + "/something"', () => {
    const result = superResolve('~/project')
    expect(result).toBe(resolve(`${fakeHomedir}/project`))
  })

  it('expands "~" in first segment when there are additional segments', () => {
    const result = superResolve('~', 'docs', 'file.txt')
    expect(result).toBe(resolve(fakeHomedir, 'docs', 'file.txt'))
  })

  it('does not expand tilde in non-leading positions', () => {
    const segments = [ 'folder', '~', 'file' ]
    const expected = resolve(...segments)
    expect(superResolve(...segments)).toBe(expected)
  })

  it('leaves an absolute path unchanged when no leading tilde', () => {
    const segments = [ '/absolute/path' ]
    expect(superResolve(...segments)).toBe(resolve(...segments))
  })

  it('does not treat Windows-style "~\\foo" as expandable', () => {
    const segments = [ '~\\folder' ]
    expect(superResolve(...segments)).toBe(resolve(...segments))
  })
})

describe('expandEnvString', () => {
  type EnvContext = {
    trackedEnvVars: string[]
    originalEnvValues: Record<string, string | undefined>
  }

  const setEnv = (
    context: EnvContext,
    name: string,
    value: string | undefined,
  ): void => {
    if (!context.trackedEnvVars.includes(name)) {
      context.trackedEnvVars.push(name)
      context.originalEnvValues[name] = process.env[name]
    }

    if (value === undefined) {
      delete process.env[name]
    }
    else {
      process.env[name] = value
    }
  }

  beforeEach<EnvContext>((context) => {
    context.trackedEnvVars = []
    context.originalEnvValues = {}
  })

  afterEach<EnvContext>((context) => {
    for (const name of context.trackedEnvVars) {
      const originalValue = context.originalEnvValues[name]

      if (originalValue === undefined) {
        delete process.env[name]
      }
      else {
        process.env[name] = originalValue
      }
    }
  })

  it('returns the input unchanged when there are no placeholders', () => {
    const input = '/no/vars/here'
    expect(expandEnvString(input)).toBe(input)
  })

  it<EnvContext>(
    'replaces ${VAR} with the value from process.env when no additional overrides are provided',
    (context) => {
      const envName = 'EXPAND_ENV_STRING_USER'
      setEnv(context, envName, 'alex')

      const placeholder = `\${${envName}}`
      const input = `/home/${placeholder}/project`

      expect(expandEnvString(input)).toBe('/home/alex/project')
    },
  )

  it<EnvContext>(
    'prefers values from the additional record over process.env when both are provided',
    (context) => {
      const envName = 'EXPAND_ENV_STRING_VALUE'
      setEnv(context, envName, 'from-env')

      const placeholder = `\${${envName}}`
      const input = `/value/${placeholder}/`

      expect(expandEnvString(input, { [envName]: 'from-additional' })).toBe('/value/from-additional/')
    },
  )

  it<EnvContext>(
    'falls back to process.env when the additional value is nullish',
    (context) => {
      const envName = 'EXPAND_ENV_STRING_NULLISH'
      setEnv(context, envName, 'non-nullish-env')

      const placeholder = `\${${envName}}`
      const input = `/nullish/${placeholder}/`

      expect(expandEnvString(input, { [envName]: null })).toBe('/nullish/non-nullish-env/')
      expect(expandEnvString(input, { [envName]: undefined })).toBe('/nullish/non-nullish-env/')
    },
  )

  it('stringifies non-string additional values such as numbers and booleans', () => {
    const input = '/count/${COUNT}/enabled/${ENABLED}/'
    const result = expandEnvString(input, {
      COUNT: 0,
      ENABLED: false,
    })

    expect(result).toBe('/count/0/enabled/false/')
  })

  it<EnvContext>(
    'leaves unknown placeholders unchanged when they are not found in additional or process.env',
    (context) => {
      const envName = 'EXPAND_ENV_STRING_UNKNOWN_SHOULD_NOT_EXIST'
      setEnv(context, envName, undefined)

      const placeholder = `\${${envName}}`
      const input = `/unknown/${placeholder}/`

      expect(expandEnvString(input)).toBe(input)
    },
  )
})
