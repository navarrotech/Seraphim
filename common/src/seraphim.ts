// Copyright © 2026 Jalapeno Labs

// Core
import { SUBDIR_APP_NAME } from '@common/constants'
import { getState } from './redux/store'

// Utility
import { join, resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'

export function getSeraphimWorkingDirectory(...additionalPath: string[]): string {
  const snapshot = getState()
  const directory = join(snapshot.context.appDir, SUBDIR_APP_NAME)

  // Ensure it exists before continuing:
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true })
  }

  if (!additionalPath?.length) {
    return resolve(directory)
  }

  const newPath = join(directory, ...additionalPath)

  if (!existsSync(newPath)) {
    mkdirSync(newPath, { recursive: true })
  }

  return resolve(newPath)
}
