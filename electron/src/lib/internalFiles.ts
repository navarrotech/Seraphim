// Copyright © 2026 Jalapeno Labs

// Core
import { app } from 'electron'

// Lib
import { resolve } from 'node:path'

// Misc
import { isProduction } from '../env'

export const BuildFiles = resolve(app.getAppPath(), '.vite', 'build')

// Directories
export const browserDir = resolve(BuildFiles, 'browser')
export const extensionsDir = resolve(BuildFiles, 'extensions')

// Specific files
export const logoPath = resolve(BuildFiles, 'logo.png')
export const backendBinaryPath = isProduction
  ? resolve(process.resourcesPath, 'verifagent')
  : resolve(app.getAppPath(), 'resources', 'verifagent')

export function getSourceFile(filename: `${string}.js`): string {
  return resolve(BuildFiles, filename)
}
