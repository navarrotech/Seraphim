// Copyright © 2025 Jalapeno Labs

import { describe, it, beforeEach, afterEach, expect } from 'vitest'

// Core
import { _electron as electron } from 'playwright' // https://playwright.dev/docs/api/class-electron
import 'electron' // Electron binaries are required for chrome driver.

// Typescript
import type { ElectronApplication, Page } from 'playwright'

// Lib
import fs from 'fs'
import { join, resolve } from 'path'

type Context = {
  app: ElectronApplication
  mainWindow: Page
}

const executable = resolve(
  join(
    __dirname,
    'out/electron-linux-x64/electron'
  )
)
if (!fs.existsSync(executable)) {
  throw new Error(
    `No executable found in ${executable}. Please compile the Electron app first.`
  )
}

const chromeSandbox = resolve(
  join(
    __dirname,
    'out/electron-linux-x64/chrome-sandbox'
  )
)

if (!fs.existsSync(chromeSandbox)) {
  throw new Error(`Chrome sandbox not found at ${chromeSandbox}`)
}

// Ensure the chrome sandbox is owned by root and set to 4755
// If it's not, throw an error!
const stats = fs.statSync(chromeSandbox)
const owner = stats.uid
if (owner !== 0 || (stats.mode & 0o4777) !== 0o4755) {
  console.log(`Chrome sandbox is owned by ${owner} with mode ${stats.mode.toString(8)}`)
  throw new Error(
    `Chrome sandbox at ${chromeSandbox} is not owned by root or does not have the correct permissions.
        
        Please run:
        sudo chown root ${chromeSandbox}
        sudo chmod 4755 ${chromeSandbox}
        `
  )
}

describe('Electron smoke test', () => {
  beforeEach<Context>(async (context) => {
    const app = await electron.launch({
      executablePath: executable,
      args: [
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--headless'
      ]
    })

    // grab the first BrowserWindow
    context.mainWindow = await app.firstWindow()

    context.app = app
  }, 120_000)

  afterEach<Context>(async (context) => {
    await context.app?.close()
  })

  it<Context>('should open and the contents should appear', async (context) => {
    expect(context.mainWindow).toBeDefined()
    // Ensure there's a div with id 'root'
    const rootDiv = await context.mainWindow.$('#root')
    expect(rootDiv).toBeDefined()
  }, 120_000)
})
