// Copyright © 2025 Jalapeno Labs

import type { SeraphimProjectConfiguration } from './types'

// Core
import { getFileFromAnyPath, recursiveSearchForFileName } from './file'
import hjson from 'hjson'
import { OPENAI_API_TOKEN } from './env'

// Lib
import path from 'path'
import fs from 'fs'

// Misc
import { cloneDeep } from 'lodash-es'
import { logJson } from './utils/logging'
import { CONFIG_FILE_NAME } from './constants'

const defaultProjectConfig: SeraphimProjectConfiguration = {
  monitorChrome: true,
  monitorTerminal: true,
  monitorVSCode: true,
  frontendUrl: 'http://localhost',
  openAiApiToken: OPENAI_API_TOKEN
}

export function getProjectConfig(root?: string): SeraphimProjectConfiguration {
  const base = root || process.cwd()

  // First look in the most expected locations
  let configFile = getFileFromAnyPath([
    path.join(base, CONFIG_FILE_NAME),
    path.join(base, '.vscode', CONFIG_FILE_NAME)
  ])

  if (!configFile) {
    configFile = recursiveSearchForFileName(CONFIG_FILE_NAME, base)
  }

  if (!configFile) {
    throw new Error(`Configuration file ${CONFIG_FILE_NAME} not found in the project root or .vscode directories.`)
  }

  try {
    const configContent = fs.readFileSync(configFile, 'utf-8')
    const parsedConfig = hjson.parse(configContent)

    // Validate and merge with default config
    return Object.assign({}, defaultProjectConfig, parsedConfig)
  }
  catch (error) {
    throw new Error(`Failed to read or parse configuration file: ${error.message}`)
  }
}

export function validateProjectConfig(config: SeraphimProjectConfiguration): boolean {
  if (!config.openAiApiToken) {
    throw new Error('OpenAI API token is required in the configuration.')
  }
  // TODO
  return true
}

export function logConfig(config: SeraphimProjectConfiguration) {
  const copy = cloneDeep(config)
  if (copy.openAiApiToken) {
    copy.openAiApiToken = copy.openAiApiToken.slice(0, 12) + '******'
  }
  console.debug('Loaded project configuration:', logJson(copy, true))
}
