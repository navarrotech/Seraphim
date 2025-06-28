// Copyright © 2025 Jalapeno Labs

// Typescript
import type { Session } from 'electron'

// Lib
import path from 'node:path'
import fs from 'node:fs'

// Misc
import { extensionsDir } from '../lib/internalFiles'
import logger from 'electron-log'

export async function initExtensions(session: Session) {
  // Sanity check to ensure the extensions directory exists
  if (!fs.existsSync(extensionsDir)) {
    return
  }

  // Ensure it's a directory
  if (!fs.statSync(extensionsDir).isDirectory()) {
    logger.warn(`Expected extensions directory at ${extensionsDir} but found a file instead.`)
    return
  }

  // For each folder in the extensions directory, load the extension
  const childFolders = fs.readdirSync(extensionsDir, { withFileTypes: true })

  for (const child of childFolders) {
    if (!child.isDirectory()) {
      continue
    }
    const extensionPath = path.join(extensionsDir, child.name)
    try {
      await session.extensions.loadExtension(
        extensionPath,
        { allowFileAccess: true }
      )
      logger.info(`Loaded extension: ${child.name}`)
    }
    catch (error) {
      logger.error(`Failed to load extension ${child.name}:`, error)
    }
  }
}
