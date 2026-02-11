// Copyright © 2026 Jalapeno Labs

process.noDeprecation = true

// Core
import { app, BrowserWindow } from 'electron'
import { newWindow } from './window'
import { gracefulShutdown } from './lib/shutdown'

// IPC
import './lib/ipc'
import './lib/open'

// Lib
import { startDatabase } from './database'
import { databaseMigrations } from './lib/migrations'
import { startApi } from './api'
import { connectToDocker } from './docker/docker'
import { registerVoiceHotkeyListener } from './transcriber'
import { getTaskManager } from './tasks/taskManager'

// https://www.npmjs.com/package/electron-squirrel-startup
import squirrelStartup from 'electron-squirrel-startup'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  console.log('Squirrel startup detected, shutting down...')
  app.quit()
}

async function startup() {
  console.info('App starting up')

  const databaseConnected = await startDatabase()
  if (!databaseConnected) {
    console.error('App failed to start due to database connection failure')
    gracefulShutdown()
    return
  }

  await databaseMigrations()

  await Promise.all([
    startApi(),
    connectToDocker(),
    registerVoiceHotkeyListener(),
  ])

  try {
    const taskManager = getTaskManager()
    await taskManager.initializeFromDatabase()
  }
  catch (error) {
    console.error('Failed to initialize task manager', error)
  }

  newWindow()
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await gracefulShutdown()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    startup()
  }
})

app.on('before-quit', async (event) => {
  event.preventDefault()
  await gracefulShutdown()
  process.exit(0)
})

app.on('ready', startup)
