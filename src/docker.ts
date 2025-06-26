// Copyright © 2025 Jalapeno Labs

import * as os from 'os'
import { runCommand } from './utils/process'

export async function getDockerLogs(containerName: string): Promise<string[]> {
  console.debug(`[DOCKER]: Getting logs for container ${containerName}`)

  // Operating system detection to determine the shell and redirection syntax
  const isWindows = os.platform() === 'win32'
  const shell = isWindows ? 'cmd.exe' : 'sh'
  const shellArg = isWindows ? '/c' : '-c'
  // Windows uses $null instead of /dev/null
  const filter = isWindows ? '1>$null' : '1>/dev/null'

  // Verify container exists
  const [ verifyOutput, verifyExitCode ] = await runCommand(
    shell, [ shellArg, 'docker', 'inspect', containerName ]
  )

  if (verifyExitCode !== 0) {
    console.debug(`[DOCKER]: Container ${containerName} does not exist or is not running: ${verifyOutput}`)
    return []
  }

  // Inspect, and get it's started at time
  const [ startedAt ] = await runCommand(
    shell, [ shellArg, 'docker', 'inspect', '--format={{.State.StartedAt}}', containerName ]
  )

  // This should filter to only include errors
  // run via shell so “1>/dev/null” actually drops stdout
  const [ output, exitCode ] = await runCommand(
    shell, [ shellArg, 'docker', 'logs', containerName, filter, '--since', startedAt ]
  )

  if (exitCode !== 0) {
    console.debug(`[DOCKER]: Failed to get logs for container ${containerName}: ${output}`)
  }

  const split = output.split('\n').filter((line) => line.trim() !== '')

  console.debug(`[DOCKER]: ${containerName}:`)
  if (split.length === 0) {
    console.debug('[]')
    return split
  }

  console.debug([
    split.length > 5 && '...',
    ...split.slice(-5)
  ].filter(Boolean).join('\n'))

  return split
}
