// Copyright © 2026 Jalapeno Labs

// Core
import { app } from 'electron'
import { isProduction } from '@electron/env'

// Lib
import { resolve } from 'node:path'

export const appPath = app.getAppPath()

// App.asar directories
export const BuildFiles = resolve(appPath, '.vite', 'build')
export const browserDir = resolve(BuildFiles, 'browser')
export const extensionsDir = resolve(BuildFiles, 'extensions')
export const logoPath = resolve(BuildFiles, 'logo.png')

// Other dirs
export const resourcesDir = isProduction
  ? process.resourcesPath || resolve(appPath, 'resources')
  : resolve(appPath, 'resources')

export const utilsDir = resolve(resourcesDir, 'utils')

export function getSourceFile(filename: `${string}.js`): string {
  return resolve(BuildFiles, filename)
}
