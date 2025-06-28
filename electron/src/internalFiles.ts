// Copyright © 2025 Jalapeno Labs

// Core
import { app } from 'electron'
import logger from 'electron-log/main'

// Lib
import path from 'node:path'

// Misc
import { isProduction } from './env'

export const BuildFiles = isProduction
  ? path.join(process.resourcesPath, 'app.asar', '.vite', 'build')
  : path.join(app.getAppPath(), 'public')

logger.debug('Build files are being served from:', BuildFiles)

// Directories
export const assetsDir = path.join(BuildFiles, 'assets')
export const browserDir = path.join(BuildFiles, 'browser')
export const extensionsDir = path.join(BuildFiles, 'extensions')

// Specific files
export const logoPath = path.join(assetsDir, 'images', 'logo.png')
