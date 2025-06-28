// Copyright © 2025 Jalapeno Labs

// Core
import './main/logging'
import './lib/redux-store'
import { app, BrowserWindow, shell } from 'electron'
import { initExtensions } from './main/extensions'

// Lib
import squirrelStartup from 'electron-squirrel-startup'
import windowStateKeeper from 'electron-window-state'
import logger from 'electron-log/main'
import serve from 'electron-serve'
import chalk from 'chalk'

// Process
import { browserDir, logoPath, getSourceFile } from './lib/internalFiles'
import { startServer, stopServer } from './main/server'
import { registerHotkeys } from './main/hotkeys'
import { logSeraphim } from './main/console'

// Browser
import { devCsp, prodCsp } from './constants'
import { FRONTEND_URL } from '@common/constants'

// Misc
import { isProduction } from './env'


// //////////////////////////// //
//            Globals           //
// //////////////////////////// //

// There should only ever be one main window.
let window: BrowserWindow

const loadDirectory = serve({
  scheme: 'app',
  hostname: 'electron',
  directory: browserDir
})

// //////////////////////////// //
//         Initialization       //
// //////////////////////////// //

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  app.quit()
}

// Enable extended debugging in development mode
if (!isProduction) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
}

// //////////////////////////// //
//       Graceful Shutdown      //
// //////////////////////////// //

let isShuttingDown = false
async function gracefulShutdown() {
  logger.info(
    chalk.yellow('Graceful shutdown initiated')
  )
  // Prevent multiple calls to this function
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true

  // Add some cleanup code here!
  await Promise.all([
    stopServer(),
    app.quit()
  ])

  logger.info(
    chalk.green('Graceful shutdown complete')
  )
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
process.on('exit', gracefulShutdown)
process.on('uncaughtException', async function ElectronGracefulShutdown(err: any) {
  if (err) {
    logger.log('Crashed', err)
  }

  try {
    logger.error('Fatal Electron crash', JSON.stringify(process.versions))
  }
  catch (error) {
    // eslint-disable-next-line no-console
    logger.error('Fatal error logging failed', error)
  }
  await gracefulShutdown()
})

// Exit cleanly on request from parent process.
if (process.platform === 'win32') {
  // this message usually fires in dev-mode from the parent process
  process.on('message', (data) => {
    if (data === 'graceful-exit') {
      console.log('if you see this message - graceful-exit fired')
      app.quit()
    }
  })
}

// //////////////////////////// //
//     Application callbacks    //
// //////////////////////////// //

async function startup() {
  await startServer()
  registerHotkeys()

  logger.info('Spawning main window')

  // Load the previous state with fallback to defaults
  const windowStateManager = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 720,
    maximize: true,
    fullScreen: false
  })

  // Create the window using the state information
  window = new BrowserWindow({
    x: windowStateManager.x,
    y: windowStateManager.y,
    width: windowStateManager.width,
    height: windowStateManager.height,
    resizable: true,
    icon: logoPath,
    webPreferences: {
      webgl: true,
      sandbox: false,
      zoomFactor: 1.0,
      // https://www.electronjs.org/docs/latest/tutorial/security#3-enable-context-isolation
      contextIsolation: true,
      // https://www.electronjs.org/docs/latest/tutorial/security#3-enable-context-isolation
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      preload: getSourceFile('preload')
    },
    autoHideMenuBar: true
  })

  // What if the user attempts to navigate away from the application?
  // Let's say they click on a link to open "https://google.com" in a new tab.
  // We need to intercept it, and open it in the user's default browser instead of the Electron app.

  // Catch in-page navigation (e.g. <a href="http://…">)
  window.webContents.on('will-navigate', (event, url) => {
    // if navigating away from your app’s origin
    if (url !== window.webContents.getURL()) {
      logger.info('Intercepting navigation to external link:', url)
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // When the application reloads, we should reset the zoom factor to 100% (normal)
  window.webContents.on('did-finish-load', () => {
    // setZoomFactor(1) = 100 % zoom
    window.webContents.setZoomFactor(1)
    initExtensions(window.webContents.session)
  })

  // Content Security Policy (CSP)
  // https://www.electronjs.org/docs/latest/tutorial/security#7-define-a-content-security-policy
  const csp: string[] = isProduction
    ? prodCsp
    : devCsp

  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [ csp.join('; ') ]
      }
    })
  })

  // https://www.electronjs.org/docs/latest/api/app#appispackaged-readonly
  if (isProduction) {
    logger.info('Serving production static build files')
    // Loads the index.html and other files for the app.
    loadDirectory(window)
  }
  else {
    logger.info(`Content: ${chalk.blue(FRONTEND_URL)}`)
    // Load the dev server:
    window.loadURL(FRONTEND_URL)
  }

  if (windowStateManager.isMaximized) {
    window.maximize()
  }

  // Let the window state manager register listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state
  windowStateManager.manage(window)

  logSeraphim()
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

app.on('ready', startup)
