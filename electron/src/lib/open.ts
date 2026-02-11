// Copyright © 2026 Jalapeno Labs

import type { OpenDialogOptions, CommandResponse } from '@common/types'

// Core
import { dialog, ipcMain, shell } from 'electron'

// Lib
import { ChildProcess } from '@common/node/ChildProcess'
import { isTtyEditor } from '@common/node/tty/isTtyEditor'
import { openInTerminal } from '@common/node/tty/openInTerminal'
import { parseCommandLine } from '@common/node/tty/parseCommandLine'

// Utility
import { dirname, resolve } from 'node:path'

// Misc
import { IPC_SIGNALS } from '@electron/constants'

// The IPC in this file is a wrapped caller around this Electron API:
// https://www.electronjs.org/docs/latest/api/dialog
let previousPickPath = process.cwd()

// The responsibility of this handler is ONLY to open a file picker and return the selected files.
// It does NOT handle any state or file read/write operations.
ipcMain.handle(
  IPC_SIGNALS.openDialog,
  async (event, options: OpenDialogOptions): Promise<string[] | null> => {
    if (!options?.defaultPath) {
      options.defaultPath = previousPickPath
    }

    try {
      const pick = await dialog.showOpenDialog(options)
      if (pick.canceled || !pick.filePaths.length) {
        return null
      }

      previousPickPath = dirname(pick.filePaths[0])

      return pick.filePaths
    }
    catch (error) {
      if (error instanceof Error) {
        console.error('Error opening file dialog:', error.message)
      }
      return null
    }
  },
)

ipcMain.handle(
  IPC_SIGNALS.openFileBrowserTo,
  (event, filePath: string) => {
    try {
      shell.showItemInFolder(
        resolve(filePath),
      )
      return {
        successful: true,
      } satisfies CommandResponse
    }
    catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to open file browser.'
      console.error('Failed to open file browser:', message)
      return {
        successful: false,
        errors: [ message ],
      } satisfies CommandResponse
    }
  },
)

ipcMain.handle(
  IPC_SIGNALS.openCodeEditorTo,
  async (event, filePath: string) => {
    if (!filePath) {
      console.warn('Invalid path used for openCodeEditorTo, returning false', filePath)
      return {
        successful: false,
        errors: [
          'Bad path used, cannot open editor to invalid path. Did you set your ip name and output path?',
        ],
      } satisfies CommandResponse
    }

    const resolvedPath = resolve(filePath)
    const preferredEditor = process.env.EDITOR || process.env.VISUAL
    const launchModeInput = process.env.SERAPHIM_EDITOR_LAUNCH_MODE || 'auto'
    let launchMode = launchModeInput.toLowerCase()
    if (launchMode !== 'auto' && launchMode !== 'terminal' && launchMode !== 'shell') {
      console.warn('Invalid SERAPHIM_EDITOR_LAUNCH_MODE, falling back to auto', {
        launchMode: launchModeInput,
      })
      launchMode = 'auto'
    }

    if (!preferredEditor?.trim()) {
      console.warn('No preferred editor found, falling back to shell.openPath')
      const fallbackError = await shell.openPath(resolvedPath)
      if (fallbackError) {
        return {
          successful: false,
          errors: [ fallbackError ],
        } satisfies CommandResponse
      }

      return {
        successful: true,
      } satisfies CommandResponse
    }

    const parsedEditor = parseCommandLine(preferredEditor)
    if (!parsedEditor) {
      console.warn('Failed to parse preferred editor command, falling back to shell.openPath', {
        preferredEditor,
      })
      const fallbackError = await shell.openPath(resolvedPath)
      if (fallbackError) {
        return {
          successful: false,
          errors: [ fallbackError ],
        } satisfies CommandResponse
      }

      return {
        successful: true,
      } satisfies CommandResponse
    }

    const editorCommand = parsedEditor.command
    const editorArguments = [ ...parsedEditor.args, resolvedPath ]
    const isTerminalEditor = isTtyEditor(editorCommand)

    if (launchMode === 'shell') {
      const fallbackError = await shell.openPath(resolvedPath)
      if (fallbackError) {
        console.warn('Shell open failed for editor request', { fallbackError })
        return {
          successful: false,
          errors: [ fallbackError ],
        } satisfies CommandResponse
      }

      return {
        successful: true,
      } satisfies CommandResponse
    }

    if (launchMode === 'terminal' || isTerminalEditor) {
      try {
        openInTerminal(editorCommand, editorArguments, {
          cwd: dirname(resolvedPath),
          title: editorCommand,
          detached: true,
        })

        return {
          successful: true,
        } satisfies CommandResponse
      }
      catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'Failed to open editor in terminal.'
        console.error('Failed to open editor in terminal:', message)
        return {
          successful: false,
          errors: [ message ],
        } satisfies CommandResponse
      }
    }

    if (parsedEditor.args.length > 0) {
      const child = new ChildProcess(editorCommand, {
        args: editorArguments,
        cwd: dirname(resolvedPath),
        stdio: 'inherit',
        shell: true,
      })

      const exitCode = await child.waitForExit()

      return {
        successful: exitCode === 0,
      } satisfies CommandResponse
    }

    const fallbackError = await shell.openPath(resolvedPath)
    if (fallbackError) {
      console.warn('Shell open failed for editor request', { fallbackError })
      return {
        successful: false,
        errors: [ fallbackError ],
      } satisfies CommandResponse
    }

    return {
      successful: true,
    } satisfies CommandResponse
  },
)
