// Copyright © 2025 Jalapeno Labs

import { dirname, join, relative } from 'path'
import { runCommand } from './process'
import { searchUpwardsForFile } from './searchUpwardsForFile'
import { existsSync } from 'fs'

export async function runTsc(
  targetFile: string
): Promise<[string, number, string]> {
  const tsconfigPath = searchUpwardsForFile(
    targetFile,
    'tsconfig.json'
  )

  if (!tsconfigPath) {
    return [ '', 0, '' ]
  }

  const baseDir = dirname(tsconfigPath)

  const tscArgs = [ '--project', 'tsconfig.json', '--noEmit' ]

  const yarnlock = join(baseDir, 'yarn.lock')
  if (existsSync(yarnlock)) {
    const [ output, code ] = await runCommand('yarn', [ 'tsc', ...tscArgs ], {
      cwd: baseDir
    })

    return [
      filterTscErrorsToJustFile(output, targetFile),
      code,
      output
    ]
  }
  else {
    const [ output, code ] = await runCommand('npx', [ '--no-install', 'tsc', ...tscArgs ], {
      cwd: baseDir
    })

    return [
      filterTscErrorsToJustFile(output, targetFile),
      code,
      output
    ]
  }
}

export function filterTscErrorsToJustFile(
  tscOutput: string,
  targetFile: string
): string {
  type TscError = {
    file: string
    output: string
  }

  // Collect errors per file
  const results: Record<string, TscError> = {}
  let currentFile: string | null = null

  // Normalize target to project‐relative, POSIX path
  const relativeTarget = relative(process.cwd(), targetFile).replace(/\\/g, '/')

  for (const line of tscOutput.split(/\r?\n/)) {
    // skip shell echoes
    if (line.startsWith('$')) {
      continue
    }

    // reset on any "Found n errors…"
    if (/^Found \d+ errors?/.test(line) || /^Done in \d/.test(line)) {
      currentFile = null
      continue
    }

    // skip the final "error Command failed…" and any "info …" lines
    if (/^(error Command failed|info\s)/.test(line)) {
      continue
    }

    // detect an error header and grab the file path
    const headerMatch = line.match(/^(.+?):\d+:\d+ - error/)
    if (headerMatch) {
      const filePath = headerMatch[1]

      // ignore node_modules
      if (filePath.includes('node_modules')) {
        currentFile = null
        continue
      }

      currentFile = filePath
      if (!results[filePath]) {
        results[filePath] = { file: filePath, output: '' }
      }

      // include the error header line
      results[filePath].output += line + '\n'
      continue
    }

    // if we're inside an error block, keep appending
    if (currentFile) {
      results[currentFile].output += line + '\n'
    }
  }

  // only pull out the target file’s block
  let finalText = ''
  for (const file in results) {
    if (relativeTarget.endsWith(file)) {
      finalText += results[file].output
    }
  }

  return finalText
}
