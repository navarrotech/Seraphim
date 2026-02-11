// Copyright © 2026 Jalapeno Labs

import type { OpenDialogOptions } from '@common/types'

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_SIGNALS } from './constants'

contextBridge.exposeInMainWorld('version', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
})

contextBridge.exposeInMainWorld('config', {
  getApiUrl: () => ipcRenderer.sendSync(IPC_SIGNALS.getApiUrl),
  exitApp: () => ipcRenderer.invoke(IPC_SIGNALS.exitApp),
  restartGui: () => ipcRenderer.invoke(IPC_SIGNALS.reloadElectron),
  openDialog: (options: OpenDialogOptions) => ipcRenderer.invoke(IPC_SIGNALS.openDialog, options),
  openFileBrowserTo: (filePath: string) => ipcRenderer.invoke(IPC_SIGNALS.openFileBrowserTo, filePath),
  openCodeEditorTo: (filePath: string) => ipcRenderer.invoke(
    IPC_SIGNALS.openCodeEditorTo,
    filePath,
  ),
})
