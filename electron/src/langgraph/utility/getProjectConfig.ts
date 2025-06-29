// Copyright © 2025 Jalapeno Labs

import type { SeraphimProjectConfiguration } from '@common/types'

// Core
import hjson from 'hjson'

// Node.js
import { join } from 'path'
import { readFileSync } from 'fs'
import { getFileFromAnyPath } from '../../../../common/src/node/getFileFromAnyPath'
import { recursiveSearchForFileName } from '../../../../common/src/node/recursiveSearchForFileName'
import { getAllRankedVsCodeWorkspaces } from './getAllRankedVsCodeWorkspaces'

// Misc
import { CONFIG_FILE_NAME } from '@common/constants'
import { OPENAI_API_KEY } from '../../env'

const defaultProjectConfig: SeraphimProjectConfiguration = {
  openAiApiToken: OPENAI_API_KEY
}

export function getProjectConfig(): [ SeraphimProjectConfiguration, string ] {
  const allWorkspaces = getAllRankedVsCodeWorkspaces(false)
  for (const workspace of allWorkspaces) {
    try {
      const config = searchDirectory(workspace)
      if (config) {
        return [ config, workspace ]
      }
    }
    catch (error) {
      console.warn(`Failed to load configuration from workspace ${workspace}: ${error.message}`)
    }
  }

  return [ defaultProjectConfig, null ]
}

function searchDirectory(base: string): SeraphimProjectConfiguration | null {
  // First look in the most expected locations (for efficiency)
  let configFile = getFileFromAnyPath([
    join(base, CONFIG_FILE_NAME),
    join(base, '.vscode', CONFIG_FILE_NAME)
  ])

  if (!configFile) {
    configFile = recursiveSearchForFileName(CONFIG_FILE_NAME, base)
  }

  if (!configFile) {
    return null
  }

  let unvalidatedConfig: Record<string, any>
  try {
    const configContent = readFileSync(configFile, 'utf-8')
    unvalidatedConfig = hjson.parse(configContent)

    // Validate and merge with default config
    unvalidatedConfig = Object.assign({}, defaultProjectConfig, unvalidatedConfig)
  }
  catch (error) {
    throw new Error(`Failed to read or parse configuration file: ${error.message}`)
  }

  return validateConfig(unvalidatedConfig)
}

export function validateConfig(config: Record<string, any>): SeraphimProjectConfiguration {
  if (!config.openAiApiToken) {
    throw new Error('OpenAI API token is required in the configuration.')
  }

  // TODO: Add more validation checks!

  return config as SeraphimProjectConfiguration
}
