// Copyright © 2026 Jalapeno Labs

// Core
import { resourcesDir } from '@electron/lib/internalFiles'

// Node.js
import { cpSync, existsSync, mkdirSync } from 'node:fs'

export function copyFromResourcesDir(targetDir: string) {
  try {
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    // Copy *contents* of resourcesDir into targetDir by copying "." from within resourcesDir
    cpSync(resourcesDir, targetDir, {
      recursive: true,
      force: true, // overwrite existing files
      errorOnExist: false,
    })
  }
  catch (error) {
    console.error(error)
    throw new Error('Resources directory copy failed')
  }
}
