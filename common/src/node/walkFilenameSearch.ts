// Copyright © 2025 Jalapeno Labs

import { readdirSync } from 'fs'
import { relative, join } from 'path'
import { COMMON_EXCLUDE_FILES, FORBIDDEN_FILES } from '@common/constants'

export function walkFilenameSearch(
  baseDir: string,
  filenamePattern: string,
  exclude: string[] = COMMON_EXCLUDE_FILES,
  forbiddenFiles: string[] = FORBIDDEN_FILES
): string[] {
  // Create a regex from the filename pattern
  const regex = new RegExp(filenamePattern)

  // Initialize results array
  const results: string[] = []

  // Walk through directories recursively
  function walk(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        // Skip any directory in our exclude lists
        if (exclude.includes(entry.name)) {
          continue
        }
        walk(fullPath)
      }
      else if (entry.isFile()) {
        // Skip forbidden filenames outright
        if (forbiddenFiles.includes(entry.name)) {
          continue
        }
        // If the filename matches the pattern, record its relative path
        if (regex.test(entry.name)) {
          const relativePath = relative(baseDir, fullPath)
          results.push(relativePath)
        }
      }
    }
  }

  walk(baseDir)
  return results
}
