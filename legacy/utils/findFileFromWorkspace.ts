// Copyright © 2025 Jalapeno Labs
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Try to resolve a file given a base workspace path and a “partial” path.
 *
 * @param {string} workspace - Absolute path to your project root
 * @param {string} partialPath - A path like '/src/gates/AuthInitialization.tsx'
 * @return {Promise<string | undefined>} Absolute path if found, or undefined
 */
export async function findFileFromWorkspace(
  workspace: string,
  partialPath: string
): Promise<string | undefined> {
  // strip any leading slashes or backslashes so normalize() treats it as relative
  const trimmedPartial = partialPath.replace(/^[/\\]+/, '')

  // normalize to use the OS-specific separator (so on Windows we get backslashes)
  const normalizedPartial = path.normalize(trimmedPartial)

  // 1) direct hit: <workspace>/<normalizedPartial>
  const direct = path.join(workspace, normalizedPartial)
  if (await fileExists(direct)) {
    return direct
  }

  // 2) maybe under a 'frontend' folder: <workspace>/frontend/<normalizedPartial>
  const viaFrontend = path.join(workspace, 'frontend', normalizedPartial)
  if (await fileExists(viaFrontend)) {
    return viaFrontend
  }

  // 3) maybe under an api/ folder: <workspace>/api/<normalizedPartial>
  const viaApi = path.join(workspace, 'api', normalizedPartial)
  if (await fileExists(viaApi)) {
    return viaApi
  }

  // 4) recursive fallback: look for any file whose relative path ends with the partial
  // split on the OS separator so this matches normalizedPartial
  const partialSegments = normalizedPartial.split(path.sep)

  // use path.basename instead of manual splitting
  const fileName = path.basename(normalizedPartial)
  const matches: string[] = []
  const ignoreDirs = new Set([ 'node_modules', '.git' ])

  async function scanDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) {
          continue
        }
        await scanDir(fullPath)
      }
      else if (entry.isFile() && entry.name === fileName) {
        const rel = path.relative(workspace, fullPath)
        if (rel.endsWith(normalizedPartial)) {
          matches.push(fullPath)
        }
      }
    }
  }

  await scanDir(workspace)

  if (matches.length === 0) {
    return undefined
  }
  if (matches.length === 1) {
    return matches[0]
  }

  // 5) rank duplicates: prefer the one with the fewest extra segments before our partial
  matches.sort((a, b) => {
    const relA = path.relative(workspace, a)
    const relB = path.relative(workspace, b)
    const extraA = relA.split(path.sep).length - partialSegments.length
    const extraB = relB.split(path.sep).length - partialSegments.length
    if (extraA !== extraB) {
      return extraA - extraB
    }
    // tiebreaker: shorter total relative path
    return relA.length - relB.length
  })

  return matches[0]
}

/**
 * Helper to test whether a given path is an existing file
 * @param {string} filePath - Absolute path to the file
 * @return {Promise<boolean>} True if the file exists and is a regular file, false
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath)
    return stat.isFile()
  }
  catch {
    return false
  }
}
