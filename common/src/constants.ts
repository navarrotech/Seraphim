// Copyright © 2025 Jalapeno Labs

import type { ChatModel } from 'openai/resources'

// URL & Web Settings
export const PORT = 9841
export const FRONTEND_PORT = 5173
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`

// Project Configuration
export const LOCAL_HOME = '.seraphim' as const
export const CONFIG_FILE_NAME = 'seraphim.jsonc' as const
export const PROMPT_CACHE_DIRNAME = 'prompt-cache' as const

// Chat Model Types

// Slowest (1/5), highest reasoning (5/5), most expensive ($2/m):
export const OPENAI_HIGH_MODEL: ChatModel = 'o3' as const
// Medium (3/5), balanced reasoning (4/5), moderate cost ($1.1/m):
export const OPENAI_MED_MODEL: ChatModel = 'o4-mini' as const
// Fastest (4/5), lowest reasoning (3/5), cheapest ($0.4/m):
export const OPENAI_LOW_MODEL: ChatModel = 'gpt-4.1-mini' as const

export const COMMON_EXCLUDE_FILES = [
  'node_modules',
  '.git',
  '.vite',
  '.bin',
  'dist',
  'out',
  'coverage',
  'logs',
  'temp',
  'tmp'
]

export const FORBIDDEN_FILES = [
  '.env',
  '.git',
  'yarn.lock',
  'package-lock.json'
]
