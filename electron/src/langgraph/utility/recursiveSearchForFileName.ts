// Copyright © 2025 Jalapeno Labs

import type { Stats } from 'fs'

// Node.js
import { existsSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

// This will recursively search for a file with the given filename starting from the baseDir.
export function recursiveSearchForFileName(
  filename: string,
  baseDir: string = process.cwd()
): string | null {
  const absoluteBaseDir: string = resolve(baseDir)

  if (!existsSync(absoluteBaseDir)) {
    return null
  }

  const items: string[] = readdirSync(absoluteBaseDir)

  for (const item of items) {
    const itemPath: string = join(absoluteBaseDir, item)
    const stats: Stats = statSync(itemPath)

    // Explore directories first
    if (stats.isDirectory()) {
      const found: string | null = recursiveSearchForFileName(
        filename,
        itemPath
      )

      if (found !== null) {
        return found
      }

      continue
    }

    // Check for filename match
    if (item === filename) {
      return itemPath
    }
  }

  return null
}
