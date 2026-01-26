// Copyright © 2026 Jalapeno Labs

import type { StandardFilePointer } from '../types.js'

// Core
import { existsSync } from 'node:fs'
import { superResolvePath } from './superResolve.ts'

export function searchFileListForExisting(paths: StandardFilePointer[]): string | null {
  for (const path of paths) {
    const resolved = superResolvePath(path)
    if (!existsSync(resolved)) {
      continue
    }

    return resolved
  }

  return null
}
