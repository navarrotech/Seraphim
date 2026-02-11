// Copyright © 2026 Jalapeno Labs

import type { ChildProcess as NodeChild } from 'child_process'

// Core
import { LinuxTerminal } from './linuxTerminal'
import { MacTerminal } from './macTerminal'
import { TerminalLauncher, type OpenInTerminalOptions } from './terminalLauncher'
import { WindowsTerminal } from './windowsTerminal'

type TerminalLauncherConstructor = new (
  command: string,
  commandArguments: string[],
  options: OpenInTerminalOptions,
) => TerminalLauncher

const TerminalLauncherByPlatform: Partial<
  Record<NodeJS.Platform, TerminalLauncherConstructor>
> = {
  darwin: MacTerminal,
  linux: LinuxTerminal,
  win32: WindowsTerminal,
}

export type { OpenInTerminalOptions }

/**
 * Opens a new terminal window and runs `command args...` inside it.
 * Best-effort across macOS/Windows/Linux.
 */
export function openInTerminal(
  command: string,
  commandArguments: string[] = [],
  options: OpenInTerminalOptions = {},
): NodeChild {
  if (!command?.trim()) {
    console.debug('openInTerminal missing command', { command })
    throw new Error('openInTerminal requires a command')
  }

  const platform = process.platform
  const TerminalLauncherClass = TerminalLauncherByPlatform[platform]
  if (!TerminalLauncherClass) {
    const warningMessage = 'openInTerminal unsupported platform, falling back to linux terminal behavior'
    console.debug(warningMessage, { platform })

    const fallbackLauncher = new LinuxTerminal(command, commandArguments, options)
    return fallbackLauncher.open()
  }

  const launcher = new TerminalLauncherClass(command, commandArguments, options)
  return launcher.open()
}
