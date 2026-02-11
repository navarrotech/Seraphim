// Copyright © 2026 Jalapeno Labs

/* eslint-disable max-len */

// Core
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Misc
import { redactSecrets } from './redactSecrets'
import {
  DOCKER_WORKDIR,
  SETUP_SCRIPT_NAME,
  BACKUP_GITHUB_CLONE_SAMPLE_URL,
} from './constants'

export async function writeScriptFile(
  contextDir: string,
  gitCloneUrl: string = BACKUP_GITHUB_CLONE_SAMPLE_URL,
  gitSourceBranch: string = 'main',
  customSetupContents?: string | null,
  secrets: string[] = [],
) {
  let customUserSetupCommands = customSetupContents?.trim()
  if (customUserSetupCommands) {
    let remappedCommands = ''
    for (const line of customUserSetupCommands.split('\n')) {
      const escaped = line.replaceAll('\'', `'\\''`) // produces: '\''
      const safe = redactSecrets(escaped, secrets)
      remappedCommands += `printf '%s\\n' '$ ${safe}'\n${line}\n`
    }

    customUserSetupCommands = `
printf "%b\n" "$\{BOLD}$\{CYAN}======== RUNNING CUSTOM SETUP SCRIPT ========$\{RESET}"

${remappedCommands}

printf "%b\n" "$\{BOLD}$\{GREEN}======== FINISHED CUSTOM SETUP SCRIPT ========$\{RESET}"
`
  }

  const updatedContent = `
#!/usr/bin/env bash
set -euo pipefail

cd ${DOCKER_WORKDIR}

# This removes non-hidden + hidden (excluding . and ..), and || true prevents an empty dir from killing the script.
# We always ensure the workdir is clear before cloning, otherwise 'git clone .' will fail
find . -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + || true

RESET='\\033[0m'
BOLD='\\033[1m'
CYAN='\\033[36m'
RED='\\033[31m'
GREEN='\\033[32m'
GRAY='\\033[90m'

trap 'printf "$\{BOLD}$\{RED}======== CUSTOM SETUP SCRIPT FAILED (exit $?) ========$\{RESET}\n"; echo; touch /opt/seraphim/setup-failed; exit 1' ERR

printf "%b\n" "$\{BOLD}$\{CYAN}======== CLONING REPOSITORY ========$\{RESET}"

echo "git clone --recurse-submodules --branch \\"${gitSourceBranch}\\" \\"${redactSecrets(gitCloneUrl, secrets)}\\" ."
git clone --recurse-submodules --branch "${gitSourceBranch}" "${gitCloneUrl}" .

printf "%b\n" "$\{BOLD}$\{GREEN}======== FINISHED CLONING ========$\{RESET}"

${customUserSetupCommands}

cd ${DOCKER_WORKDIR}

touch /opt/seraphim/setup-success

echo "Starting up codex..."
codex app-server
  `

  const scriptPath = resolve(contextDir, SETUP_SCRIPT_NAME)
  await writeFile(scriptPath, updatedContent, 'utf8')

  return SETUP_SCRIPT_NAME
}
