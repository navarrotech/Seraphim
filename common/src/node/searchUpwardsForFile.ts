// Copyright © 2026 Jalapeno Labs

import path from 'path'
import fs from 'fs'

export function searchUpwardsForFile(
  startPath: string,
  filename: string = 'package.json',
  getHighestFile: boolean = false,
): string | null {
  // Resolve the starting path to an absolute path
  let currentDir = path.resolve(startPath)
  let foundTarget: string | null = null

  // Traverse upward until the filesystem root is reached

  while (true) {
    // Build the path to the target file in the current directory
    const targetPath = path.join(currentDir, filename)

    // console.debug(' > Trying to find file:', targetPath)

    // Check if the target file exists and is a file
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      foundTarget = targetPath

      // If we are not looking for the highest file, return immediately
      if (!getHighestFile) {
        // console.log(' > Found a match, returning immediately...')
        break
      }

      // console.log(' > Found a match, but proceeding upwards as directed...')
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

  // If we are looking for the highest file, return the last found target
  // If it wasn't found, it will return null naturally
  return foundTarget
}

export function searchUpwardsForFiles(
  startPath: string,
  filenames: string[],
  getHighestFile: boolean = false,
): string | null {
  for (const filename of filenames) {
    const foundFile = searchUpwardsForFile(startPath, filename, getHighestFile)
    if (foundFile) {
      return foundFile
    }
  }

  return null
}
