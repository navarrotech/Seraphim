// Copyright © 2025 Jalapeno Labs

import { existsSync } from 'fs'
import { resolve } from 'path'

export function getFileFromAnyPath(paths: string[]) {
  for (let filePath of paths) {
    filePath = resolve(filePath)
    if (existsSync(filePath)) {
      return filePath
    }
  }
  return null
}
