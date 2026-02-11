// Copyright © 2026 Jalapeno Labs

import type { ChildProcess as NodeChild } from 'child_process'

// Core
import { spawn } from 'child_process'
import { TerminalLauncher } from './terminalLauncher'

export class MacTerminal extends TerminalLauncher {
  public open(): NodeChild {
    const commandLine = this.buildPosixCommandLineWithTitle()
    const appleScript = this.buildAppleScript(commandLine)
    const childProcess = spawn(
      'osascript',
      [ '-e', appleScript ],
      this.getCommonSpawnOptions(),
    )

    return this.finalizeChild(childProcess)
  }

  private buildAppleScript(commandLine: string): string {
    const escapedCommandLine = this.escapeAppleScriptArgument(commandLine)

    return [
      'tell application "Terminal"',
      `do script "${escapedCommandLine}"`,
      'activate',
      'end tell',
    ].join('\n')
  }

  private escapeAppleScriptArgument(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  }
}
