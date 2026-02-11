// Copyright © 2026 Jalapeno Labs

import type { OpenDialogOptions, CommandResponse } from '@common/types'

// Core
import { dialog, ipcMain, shell } from 'electron'
import { ChildProcess } from '@bifrost/node/ChildProcess'

// Misc
import { IPC_SIGNALS } from '@electron/constants'
import { dirname, resolve } from 'node:path'

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
      console.error('Failed to open file browser:', error)
      return {
        successful: false,
        errors: [ (error as Error).message ],
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
        errors: [ 'Bad path used, cannot open editor to invalid path. Did you set your ip name and output path?' ],
      } satisfies CommandResponse
    }

    const resolvedPath = resolve(filePath)

    try {
      // TODO: Add support for settings control!
      const preferredEditor = process.env.EDITOR || process.env.VISUAL

      if (!preferredEditor) {
        return {
          successful: false,
          errors: [
            'No editor found. Please set your preferred editor in the settings or in a $EDITOR environment variable.',
          ],
        } satisfies CommandResponse
      }

      const child = new ChildProcess(preferredEditor, {
        args: [ resolvedPath ],
        cwd: dirname(resolvedPath),
        stdio: 'inherit',
        shell: true,
      })

      const exitCode = await child.waitForExit()

      return {
        successful: exitCode === 0,
      } satisfies CommandResponse
    }
    catch (error) {
      console.error('Failed to open editor:', error)

      let message: string
      if (error instanceof Error) {
        message = error.message
      }

      // If that fails (no CLI editor found), fall back to OS default
      // shell.openPath uses `xdg-open` on Linux, so if
      // you've set VScode (or WebStorm) as your default "Open With"
      // for a given file type, it'll still launch your GUI editor
      try {
        const fallbackErrorMessage: string | null = await shell
          .openPath(resolvedPath)
          .catch((error) => (error as Error)?.message)

        if (fallbackErrorMessage) {
          console.error('Failed to open editor via shell.openPath:', fallbackErrorMessage)

          return {
            successful: false,
            errors: [ message, fallbackErrorMessage ],
          } satisfies CommandResponse
        }
      }
      catch (error) {
        console.error('Failed to open file browser', error)
        // If it wasn't successful, report the original error back to the renderer

        return {
          successful: false,
          errors: [ message ],
        } satisfies CommandResponse
      }
    }

    return {
      successful: false,
      errors: [ 'Failed to open editor.' ],
    }
  },
)
