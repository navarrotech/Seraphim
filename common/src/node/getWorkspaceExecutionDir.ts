// Copyright © 2025 Jalapeno Labs

import { searchUpwardsForFile } from './searchUpwardsForFile'
import { dirname } from 'path'


export function getWorkspaceExecutionDir(filePath?: string): string | null {
  if (!filePath) {
    return null
  }

  const packageJson = searchUpwardsForFile(
    filePath,
    'package.json',
    false
  )

  if (!packageJson) {
    return null
  }

  return dirname(packageJson)
}
