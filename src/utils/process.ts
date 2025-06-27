// Copyright © 2025 Jalapeno Labs

// Core
import { spawn, type SpawnOptions } from 'child_process'
import path from 'path'

/**
 * Spawns a child process asynchronously and returns its combined stdout and stderr output.
 *
 * @param {string} command - The command to execute
 * @param {string[]} args - An array of string arguments to pass to the command (defaults to an empty array)
 * @param {SpawnOptions} options - Spawn options as defined by Node’s SpawnOptions (defaults to an empty object)
 * @return {Promise<string>} A Promise that resolves with the combined stdout and stderr text once the process exits
 * @throws {Error} If the process fails to spawn, the promise is rejected with the spawn error
 */
export async function runCommand(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<[string, number, string]> {
  return new Promise<[string, number, string]>((resolve) => {
    options.stdio = [ 'ignore', 'pipe', 'pipe' ]
    options.shell = true

    const fullCommand = `${command} ${args.join(' ')}`

    let output: string = ''
    let child: ReturnType<typeof spawn> | null = null

    if (options.cwd && typeof options.cwd === 'string') {
      options.cwd = path.resolve(options.cwd)
    }

    // console.debug(`  >> Running child process command: '${fullCommand}'`)

    // Try to spawn the process; if spawning throws, catch and return exit code 1
    try {
      child = spawn(command, args, options)
    }
    catch (spawnErr) {
      // Append the spawn error message to output
      if (spawnErr instanceof Error) {
        output += spawnErr.message
      }
      else {
        output += String(spawnErr)
      }
      // Resolve immediately with exit code 1
      output = stripAnsiColors(output)
      resolve([ output, 1, fullCommand ])
      return
    }

    // Collect stdout data
    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        output += chunk.toString()
      })
    }

    // Collect stderr data
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        output += chunk.toString()
      })
    }

    // Handle runtime errors (e.g., executable not found after spawn)
    child.on('error', (err) => {
      // Append the error message to output
      output += err.message
      output = stripAnsiColors(output)
      // Resolve with exit code 1
      resolve([ output, 1, fullCommand ])
    })

    // When the process exits (regardless of exit code), resolve with collected output
    child.on('close', () => {
      output = stripAnsiColors(output)
      resolve([ output, child.exitCode ?? 0, fullCommand ])
    })
  })
}

export function stripAnsiColors(input: string): string {
  // Regular expression to match ANSI escape sequences for colors

  /* eslint-disable no-control-regex */
  const ansiRegex = /\x1B\[[0-9;]*m/g

  // Replace all matches with empty string
  const result = input.replace(ansiRegex, '')

  return result
}
