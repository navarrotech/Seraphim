// Copyright © 2025 Jalapeno Labs

// Core
import { homedir } from 'os'
import { LOCAL_HOME } from '@common/constants'

// Utility
import { join, resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'

export function getSeraphimHomeDirectory(...additionalPath: string[]): string {
  const directory = join(homedir(), LOCAL_HOME)

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
