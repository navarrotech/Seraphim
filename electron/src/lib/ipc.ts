// Copyright © 2026 Jalapeno Labs

// Core
import { app, ipcMain } from 'electron'
import { IPC_SIGNALS } from '@electron/constants'
import { gracefulShutdown } from './shutdown'

// Misc
import { API_PORT } from '@electron/env'

ipcMain.on(IPC_SIGNALS.getApiUrl, (event) => {
  event.returnValue = `http://localhost:${API_PORT}`
})

ipcMain.handle(IPC_SIGNALS.exitApp, async () => {
  await gracefulShutdown()
})

ipcMain.handle(IPC_SIGNALS.reloadElectron, async () => {
  app.relaunch()
  await gracefulShutdown()
})
