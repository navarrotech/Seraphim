// Copyright © 2026 Jalapeno Labs

import type { ChildProcess as NodeChild } from 'child_process'

// Core
import { spawn } from 'child_process'
import { TerminalLauncher } from './terminalLauncher'

export class WindowsTerminal extends TerminalLauncher {
  public open(): NodeChild {
    const windowsCommandLine = this.buildWindowsCommandLine()
    const windowsTerminalBinary = this.getWindowsTerminalBinary()

    if (windowsTerminalBinary) {
      const windowsTerminalArguments = [
        '-d',
        this.workingDirectory,
        'cmd.exe',
        '/k',
        windowsCommandLine,
      ]
      const childProcess = spawn(
        windowsTerminalBinary,
        windowsTerminalArguments,
        this.getCommonSpawnOptions(),
      )

      return this.finalizeChild(childProcess)
    }

    console.debug('Windows Terminal not found, falling back to cmd.exe', {
      command: this.command,
    })

    const childProcess = spawn(
      'cmd.exe',
      [ '/c', 'start', '""', 'cmd.exe', '/k', windowsCommandLine ],
      this.getCommonSpawnOptions(),
    )

    return this.finalizeChild(childProcess)
  }

  private getWindowsTerminalBinary(): string | undefined {
    if (this.hasCommand('wt.exe')) {
      return 'wt.exe'
    }

    if (this.hasCommand('wt')) {
      return 'wt'
    }

    return undefined
  }
}
