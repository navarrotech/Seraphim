// Copyright © 2025 Jalapeno Labs

// Core
import { app } from 'electron'

// Lib
import path from 'node:path'

// Misc
import { isProduction } from '../env'

export const BuildFiles = isProduction
  ? path.join(process.resourcesPath, 'app.asar', '.vite', 'build')
  : path.join(app.getAppPath(), 'public')

// Directories
export const assetsDir = path.join(BuildFiles, 'assets')
export const browserDir = path.join(BuildFiles, 'browser')
export const extensionsDir = path.join(BuildFiles, 'extensions')

// Specific files
export const logoPath = path.join(assetsDir, 'images', 'logo.png')

export function getSourceFile(filename: string): string {
  // Always target the .js file:
  filename = filename + '.js'

  if (isProduction) {
    return path.join(BuildFiles, filename)
  }
  return path.join(app.getAppPath(), '.vite', 'build', filename)
}
