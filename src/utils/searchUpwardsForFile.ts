// Copyright © 2025 Jalapeno Labs

import path from 'path'
import fs from 'fs'

export function searchUpwardsForFile(
  startPath: string,
  filename: string = 'package.json'
): string {
  // Resolve the starting path to an absolute path
  let currentDir = path.resolve(startPath)

  // Traverse upward until the filesystem root is reached
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Build the path to the target file in the current directory
    const targetPath = path.join(currentDir, filename)

    // Check if the target file exists and is a file
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      return targetPath
    }

    // Determine the parent directory
    const parentDir = path.dirname(currentDir)

    // If we've reached the filesystem root (parent equals current), stop searching
    if (parentDir === currentDir) {
      break
    }

    // Move up one level and continue searching
    currentDir = parentDir
  }

  // If no package.json was found in any parent, return an empty string
  return ''
}
