// Copyright © 2026 Jalapeno Labs

import type { Action } from '@reduxjs/toolkit'

// Core
import { ipcMain, BrowserWindow } from 'electron'
import { validateIpc } from './lib/ipc'
import { store } from '@common/redux/store'

// Misc
import { IPC_SIGNALS } from './constants'

ipcMain.on(IPC_SIGNALS.reduxGetState, (event) => {
  if (!validateIpc(event.senderFrame)) {
    return
  }
  event.returnValue = store.getState()
})

ipcMain.on(IPC_SIGNALS.reduxDispatch, (event, action: Action) => {
  if (!validateIpc(event.senderFrame)) {
    return
  }
  if (!action) {
    console.warn('Received empty action in redux:dispatch')
    return
  }
  event.returnValue = store.dispatch(action)
})

store.subscribe(() => {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_SIGNALS.reduxStateChanged, store.getState())
  }
})
