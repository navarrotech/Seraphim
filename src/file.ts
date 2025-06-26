// Copyright © 2025 Jalapeno Labs

import fs from 'fs'
import path from 'path'

export function getFileFromAnyPath(paths: string[]) {
  for (let filePath of paths) {
    filePath = path.resolve(filePath)
    if (fs.existsSync(filePath)) {
      return filePath
    }
  }
  return null
}

// This will recursively search for a file with the given filename starting from the baseDir.
export function recursiveSearchForFileName(
  filename: string,
  baseDir: string = process.cwd()
): string | null {
  const absoluteBaseDir: string = path.resolve(baseDir)

  if (!fs.existsSync(absoluteBaseDir)) {
    return null
  }

  const items: string[] = fs.readdirSync(absoluteBaseDir)

  for (const item of items) {
    const itemPath: string = path.join(absoluteBaseDir, item)
    const stats: fs.Stats = fs.statSync(itemPath)

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
