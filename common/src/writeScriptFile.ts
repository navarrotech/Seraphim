// Copyright © 2026 Jalapeno Labs

// Core
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Misc
import { DOCKER_WORKDIR } from './constants.js'

export async function writeScriptFile(
  contextDir: string,
  filename: string,
  contents?: string | null,
) {
  const trimmed = contents?.trim()
  if (!trimmed) {
    console.debug('writeScriptFile received empty contents', { filename, trimmed })
    return undefined
  }

  const updatedContent = `
#!/usr/bin/env bash
set -euo pipefail

cd ${DOCKER_WORKDIR}

${trimmed}
  `

  const scriptPath = join(contextDir, filename)
  await writeFile(scriptPath, updatedContent, 'utf8')

  return filename
}
