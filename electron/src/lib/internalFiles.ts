// Copyright © 2026 Jalapeno Labs

// Core
import { app } from 'electron'

// Lib
import { resolve } from 'node:path'

export const appPath = app.getAppPath()

// App.asar directories
export const BuildFiles = resolve(appPath, '.vite', 'build')
export const browserDir = resolve(BuildFiles, 'browser')
export const extensionsDir = resolve(BuildFiles, 'extensions')
export const logoPath = resolve(BuildFiles, 'logo.png')

// Other dirs
export const resourcesDir = process.resourcesPath || resolve(appPath, 'resources')

export function getSourceFile(filename: `${string}.js`): string {
  return resolve(BuildFiles, filename)
}
