// Copyright © 2026 Jalapeno Labs

// Core
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Lib
import { config } from 'dotenv'

function getElectronEnvPaths(): string[] {
  const localEnvPath = resolve(process.cwd(), '.env')
  const rootEnvPath = resolve(process.cwd(), '..', '.env')

  return [ localEnvPath, rootEnvPath ]
}

function loadEnvFromPaths(envPaths: string[]): string | null {
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      continue
    }

    config({ path: envPath })
    return envPath
  }

  return null
}

export function loadElectronEnv(): void {
  const envPaths = getElectronEnvPaths()
  const loadedPath = loadEnvFromPaths(envPaths)

  if (!loadedPath) {
    console.debug('No .env file found for electron process', { envPaths })
    return
  }

  console.debug('Loaded .env for electron process', { path: loadedPath })
}
