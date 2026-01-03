// Copyright © 2026 Jalapeno Labs

import type { ElectronIpcBridge, VersionIpcVersion, ReduxIpcBridge, ReduxState } from '@common/types'

// Core
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_SIGNALS } from './constants'

// Lib
import { preloadLogger } from './preload/logging'
import * as disposables from './lib/disposables'

contextBridge.exposeInMainWorld('electron', {
  log: preloadLogger,
} as ElectronIpcBridge)

contextBridge.exposeInMainWorld('redux', {
  getState: () => ipcRenderer.sendSync(IPC_SIGNALS.reduxGetState),
  dispatch: (action) => ipcRenderer.sendSync(IPC_SIGNALS.reduxDispatch, action),
  subscribe: (callback) => disposables.bindListenFunction(
    ipcRenderer,
    IPC_SIGNALS.reduxStateChanged,
    (_event, state: ReduxState) => callback(state),
  ),
} satisfies ReduxIpcBridge)

contextBridge.exposeInMainWorld('version', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
} as VersionIpcVersion)
