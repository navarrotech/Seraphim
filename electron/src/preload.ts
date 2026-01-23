// Copyright © 2026 Jalapeno Labs

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_SIGNALS } from './constants'

contextBridge.exposeInMainWorld('version', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
})

contextBridge.exposeInMainWorld('config', {
  getApiUrl: () => ipcRenderer.sendSync(IPC_SIGNALS.getApiUrl),
})
