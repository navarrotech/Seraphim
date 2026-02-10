// Copyright © 2026 Jalapeno Labs

// Core
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Misc
import { DOCKER_WORKDIR } from './constants.js'

export async function writeScriptFile(
  contextDir: string,
  filename: string,
  contents?: string | null,
) {
  let customUserSetupCommands = contents?.trim()
  if (customUserSetupCommands) {
    customUserSetupCommands = `
echo "======== RUNNING CUSTOM SETUP SCRIPT ========"
${customUserSetupCommands}
echo "======== FINISHED CUSTOM SETUP SCRIPT ========"
`
  }

  const updatedContent = `
#!/usr/bin/env bash
set -eu pipefail

trap 'echo "======== CUSTOM SETUP SCRIPT FAILED (exit $?) ========"; touch /opt/seraphim/setup-failed; exit 1' ERR

cd ${DOCKER_WORKDIR}

${customUserSetupCommands}

touch /opt/seraphim/setup-success
echo "System is ready to begin generation commands"

codex app-server
  `

  const scriptPath = resolve(contextDir, filename)
  await writeFile(scriptPath, updatedContent, 'utf8')

  return filename
}
