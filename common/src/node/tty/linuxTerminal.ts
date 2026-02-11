// Copyright © 2026 Jalapeno Labs

import type { ChildProcess as NodeChild } from 'child_process'

// Core
import { spawn } from 'child_process'
import { TerminalLauncher } from './terminalLauncher'

type TerminalLaunchConfiguration = {
  terminalBinary: string
  terminalArguments: string[]
}

export class LinuxTerminal extends TerminalLauncher {
  public open(): NodeChild {
    const terminalCandidates = this.getTerminalCandidates()
    const terminalBinary = this.findTerminalBinary(terminalCandidates)

    if (!terminalBinary) {
      console.debug('No terminal emulator found, running command directly', {
        command: this.command,
      })

      const childProcess = spawn(
        this.command,
        this.commandArguments,
        this.getCommonSpawnOptions(),
      )

      return this.finalizeChild(childProcess)
    }

    const { terminalBinary: resolvedBinary, terminalArguments } = this.getLaunchConfiguration(
      terminalBinary,
    )
    const childProcess = spawn(
      resolvedBinary,
      terminalArguments,
      this.getCommonSpawnOptions(),
    )

    return this.finalizeChild(childProcess)
  }

  private getTerminalCandidates(): string[] {
    const preferred = this.preferLinuxTerminal ? [ this.preferLinuxTerminal ] : []
    const candidates = [
      ...preferred,
      'x-terminal-emulator',
      'gnome-terminal',
      'konsole',
      'xfce4-terminal',
      'mate-terminal',
      'lxterminal',
      'tilix',
      'xterm',
      'alacritty',
      'kitty',
      'wezterm',
      'foot',
      'st',
      'urxvt',
      'rxvt',
    ]

    return this.getUniqueCandidates(candidates)
  }

  private findTerminalBinary(terminalCandidates: string[]): string | undefined {
    for (const terminalCandidate of terminalCandidates) {
      if (this.hasCommand(terminalCandidate)) {
        return terminalCandidate
      }
    }

    return undefined
  }

  private getLaunchConfiguration(
    terminalBinary: string,
  ): TerminalLaunchConfiguration {
    const shellCommand = this.buildPosixCommandLineWithTitle()

    if (
      terminalBinary === 'gnome-terminal'
      || terminalBinary === 'mate-terminal'
      || terminalBinary === 'tilix'
    ) {
      return {
        terminalBinary,
        terminalArguments: [ '--', 'bash', '-lc', shellCommand ],
      }
    }

    if (terminalBinary === 'konsole') {
      return {
        terminalBinary,
        terminalArguments: [ '-e', 'bash', '-lc', shellCommand ],
      }
    }

    if (terminalBinary === 'xfce4-terminal' || terminalBinary === 'lxterminal') {
      return {
        terminalBinary,
        terminalArguments: [
          '-e',
          `bash -lc ${this.escapePosixArgument(shellCommand)}`,
        ],
      }
    }

    if (terminalBinary === 'wezterm') {
      return {
        terminalBinary,
        terminalArguments: [ 'start', '--', 'bash', '-lc', shellCommand ],
      }
    }

    if (terminalBinary === 'kitty') {
      return {
        terminalBinary,
        terminalArguments: [ '--', 'bash', '-lc', shellCommand ],
      }
    }

    if (terminalBinary === 'alacritty') {
      return {
        terminalBinary,
        terminalArguments: [ '-e', 'bash', '-lc', shellCommand ],
      }
    }

    if (terminalBinary === 'foot') {
      return {
        terminalBinary,
        terminalArguments: [ 'bash', '-lc', shellCommand ],
      }
    }

    return {
      terminalBinary,
      terminalArguments: [ '-e', 'bash', '-lc', shellCommand ],
    }
  }

  private getUniqueCandidates(candidates: string[]): string[] {
    const uniqueCandidates: string[] = []
    const seenCandidates = new Set<string>()

    for (const candidate of candidates) {
      if (seenCandidates.has(candidate)) {
        continue
      }

      seenCandidates.add(candidate)
      uniqueCandidates.push(candidate)
    }

    return uniqueCandidates
  }
}
