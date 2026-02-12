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
  SETUP_SUCCESS_LINE,
  SETUP_FAILURE_LINE,
} from './constants'

export async function writeSetupScriptFile(
  contextDir: string,
  gitCloneUrl: string = BACKUP_GITHUB_CLONE_SAMPLE_URL,
  gitSourceBranch: string = 'main',
  customSetupContents?: string,
  secrets: string[] = [],
) {
  let customUserSetupCommands = customSetupContents?.trim() ?? ''
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
    `.trim()
  }

  const updatedContent = `
#!/usr/bin/env bash
set -euo pipefail

RESET='\\033[0m'
BOLD='\\033[1m'
CYAN='\\033[36m'
RED='\\033[31m'
GREEN='\\033[32m'
GRAY='\\033[90m'

# Merge stderr into stdout for the setup block: '{ ... } 2>&1'
# This is to enforce logging in the setup stuff is intrepeted in the same order for logging without TTY attached
# Without this, logs get "mixed up" and stderr might be logged on the container out of order.
{
  trap 'printf "$\{BOLD}$\{RED}${SETUP_FAILURE_LINE} (exit $?)$\{RESET}\n"; echo; touch /opt/seraphim/setup-failed; exit 1' ERR

  cd ${DOCKER_WORKDIR}

  # This removes non-hidden + hidden (excluding . and ..), and || true prevents an empty dir from killing the script.
  # We always ensure the workdir is clear before cloning, otherwise 'git clone .' will fail
  find . -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + || true

  printf "%b\n" "$\{BOLD}$\{CYAN}======== CLONING REPOSITORY ========$\{RESET}"

  echo "git clone --recurse-submodules --branch \\"${gitSourceBranch}\\" \\"${redactSecrets(gitCloneUrl, secrets)}\\" ."
  git clone --recurse-submodules --branch "${gitSourceBranch}" "${gitCloneUrl}" .
  echo "Git clone complete."

  #ls -1AF --group-directories-first
  echo "Cloned workspace files:"
  (cd / && tree -aF -L 1 ${DOCKER_WORKDIR})

  printf "%b\n" "$\{BOLD}$\{GREEN}======== FINISHED CLONING ========$\{RESET}"

  ${customUserSetupCommands}

  # CD again b/c the custom user commands might have changed the directory, but we want to ensure we're in the workspace at the end of the setup script
  cd ${DOCKER_WORKDIR}

  touch /opt/seraphim/setup-success
  printf "%b\n" "$\{BOLD}$\{GREEN}${SETUP_SUCCESS_LINE}$\{RESET}"
} 2>&1

echo "Codex version: $(codex --version)"
echo "Codex bin: $(which codex || true)"

# Idle indefinitely on the main process
tail -f /dev/null
  `

  const scriptPath = resolve(contextDir, SETUP_SCRIPT_NAME)
  await writeFile(scriptPath, updatedContent, 'utf8')

  return SETUP_SCRIPT_NAME
}
