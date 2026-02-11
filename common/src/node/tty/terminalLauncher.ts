// Copyright © 2026 Jalapeno Labs

import type { ChildProcess as NodeChild, SpawnOptions } from 'child_process'

// Core
import { spawnSync } from 'child_process'

export type OpenInTerminalOptions = {
  cwd?: string
  env?: NodeJS.ProcessEnv
  title?: string
  /**
   * Prefer this terminal emulator on Linux if present (e.g. "kitty", "wezterm", "alacritty")
   */
  preferLinuxTerminal?: string
  /**
   * If true, returns immediately (detached). Default true.
   */
  detached?: boolean
}

export class TerminalLauncher {
  protected readonly command: string
  protected readonly commandArguments: string[]
  protected readonly workingDirectory: string
  protected readonly environmentVariables: NodeJS.ProcessEnv
  protected readonly title?: string
  protected readonly preferLinuxTerminal?: string
  protected readonly detached: boolean

  constructor(
    command: string,
    commandArguments: string[],
    options: OpenInTerminalOptions,
  ) {
    this.command = command
    this.commandArguments = commandArguments
    this.workingDirectory = options.cwd || process.cwd()
    this.environmentVariables = options.env || process.env
    this.title = options.title
    this.preferLinuxTerminal = options.preferLinuxTerminal
    this.detached = options.detached ?? true
  }

  public open(): NodeChild {
    const warningMessage = 'TerminalLauncher open called directly, use a platform-specific launcher'
    console.debug(warningMessage, { command: this.command })
    throw new Error('TerminalLauncher is not meant to be used directly')
  }

  protected getCommonSpawnOptions(): SpawnOptions {
    return {
      cwd: this.workingDirectory,
      env: this.environmentVariables,
      detached: this.detached,
      stdio: 'ignore',
    }
  }

  protected finalizeChild(childProcess: NodeChild): NodeChild {
    if (this.detached) {
      childProcess.unref()
    }
    return childProcess
  }

  protected hasCommand(commandName: string): boolean {
    const platform = process.platform
    const commandToFind = platform === 'win32' ? 'where' : 'command'
    const commandArguments = platform === 'win32'
      ? [ commandName ]
      : [ '-v', commandName ]
    const result = spawnSync(
      commandToFind,
      commandArguments,
      { stdio: 'ignore' },
    )
    return result.status === 0
  }

  protected escapePosixArgument(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`
  }

  protected escapeWindowsArgument(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
  }

  protected escapeAnsiTitle(title: string): string {
    return title.replace(/"/g, '\\"')
  }

  protected buildPosixCommandLine(): string {
    const argumentsToEscape = [ this.command, ...this.commandArguments ]
    const escapedArguments: string[] = []
    for (const argument of argumentsToEscape) {
      escapedArguments.push(this.escapePosixArgument(argument))
    }
    const escapedWorkingDirectory = this.escapePosixArgument(this.workingDirectory)
    const escapedCommand = escapedArguments.join(' ')

    return [
      `cd ${escapedWorkingDirectory}`,
      escapedCommand,
      'exec $SHELL -l',
    ].join('; ')
  }

  protected buildPosixCommandLineWithTitle(): string {
    const commandLine = this.buildPosixCommandLine()
    if (!this.title) {
      return commandLine
    }

    const escapedTitle = this.escapeAnsiTitle(this.title)
    const titleSequence = `printf "\\e]0;${escapedTitle}\\a"`
    return [ titleSequence, commandLine ].join('; ')
  }

  protected buildWindowsCommandLine(): string {
    const argumentsToEscape = [ this.command, ...this.commandArguments ]
    const escapedArguments: string[] = []
    for (const argument of argumentsToEscape) {
      escapedArguments.push(this.escapeWindowsArgument(argument))
    }
    const escapedWorkingDirectory = this.escapeWindowsArgument(this.workingDirectory)
    const escapedCommand = escapedArguments.join(' ')

    return [
      `cd /d ${escapedWorkingDirectory}`,
      escapedCommand,
    ].join(' && ')
  }
}
