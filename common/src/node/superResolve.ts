// Copyright © 2026 Jalapeno Labs

import type { StandardFilePointer } from '../types.js'

import { homedir } from 'node:os'
import { resolve, join } from 'node:path'
import { sync as globglobgabgolabSync } from 'glob'
import { validAbsoluteLinuxFilePathRegex } from '../regex.js'
import chalk from 'chalk'

export function superResolvePath(filePointer: StandardFilePointer): string {
  if (Array.isArray(filePointer)) {
    return superResolve(...filePointer)
  }

  return superResolve(filePointer)
}

// This will resolve paths better than native Node.js
// - resolves "~" to the user's home directory
// - resolves absolute and relative paths correctly
// - resolves env vars wrapped in brackets like /tmp/${USER}/dir
// - resolves globs like "*" and "**/*"
export function superResolve(...paths: string[]): string {
  if (!paths.length) {
    throw new Error('superResolve requires at least one path segment')
  }
  if (paths.some((path) => !path)) {
    console.debug(paths)
    throw new Error('Cannot resolve bad path segment')
  }

  let [ first, ...rest ] = paths

  // If the caller passes something that already looks like an absolute Linux
  // path, but it doesn't match our validity rules, log and return it
  // unchanged. This preserves the original superResolve behaviour for
  // relative paths and tilde-expansion while still surfacing clearly invalid
  // absolute paths.
  const candidatePath = join(first, ...rest)
  if (candidatePath.startsWith('/') && !validAbsoluteLinuxFilePathRegex.test(candidatePath)) {
    console.debug(
      `Resolving path failed: "${chalk.cyan(candidatePath)}" is not a valid absolute Linux file path`,
    )
    return candidatePath
  }

  // Work with a copy to avoid mutating the caller’s array
  if (first?.startsWith('~')) {
    // Replace "~" or "~/something" with "/home/user" or "/home/user/something"
    first = first.replace(/^~(\/|$)/, homedir() + '$1')
  }

  // [ foo, ${bar}, *.csv ] -> "foo/${bar}, *.csv"
  const conjoined = join(first, ...rest)
  // "foo/${bar}, *.csv" -> "/home/user/foo/${bar}, *.csv"
  const expanded = expandEnvString(conjoined)
  // "/home/user/foo/${bar}, *.csv" -> "/home/user/foo/env-value, *.csv"
  const resolved = resolve(expanded)
  // "/home/user/foo/env-value, *.csv" -> [ "/home/user/foo/env-value/file1.csv", ... ]
  const globbed = globglobgabgolabSync(resolved)

  return globbed[0] || resolved
}

/**
 * Replaces ${VAR_NAME} in the input string with process.env.VAR_NAME or additional
 *
 * Example:
 *   process.env.USER = "alex";
 *   expandEnvString("/my/file/${USER}/foo") -> "/my/file/alex/foo"
 *
 * Example 2:
 *   expandEnvString("/${VALUE}/", { VALUE: "popcorn" }) -> "/popcorn/"
 */
export function expandEnvString(
  input: string,
  additional?: Record<string, number | boolean | string | null | undefined>,
): string {
  return input.replace(/\$\{([^}]+)\}/g, (match, varName: string) => {
    // 1. Prefer value from additional record if provided
    if (additional !== undefined) {
      const isAdditionalNullish = additional[varName] == null || additional[varName] === undefined
      if (!isAdditionalNullish) {
        return String(additional[varName])
      }
    }

    // 2. Fallback to process.env
    const envValue = process.env[varName]
    if (envValue !== undefined) {
      return String(envValue)
    }

    // 3. If nothing found, leave the placeholder unchanged
    return match
  })
}
