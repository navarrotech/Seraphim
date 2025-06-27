// Copyright © 2025 Jalapeno Labs

// Typescript
import type { ChatModel } from 'openai/resources'

// Core
import { join } from 'path'

export const CONFIG_FILE_NAME = 'seraphim.jsonc' as const
export const API_PORT = 9841

// Slowest (1/5), highest reasoning (5/5), most expensive ($2/m):
export const OPENAI_HIGH_MODEL: ChatModel = 'o3' as const
// Medium (3/5), balanced reasoning (4/5), moderate cost ($1.1/m):
export const OPENAI_MED_MODEL: ChatModel = 'o4-mini' as const
// Fastest (4/5), lowest reasoning (3/5), cheapest ($0.4/m):
export const OPENAI_LOW_MODEL: ChatModel = 'gpt-4.1-mini' as const

export const REGISTERED_ACTIONS = [
  'analyzeError',
  'writeJsDoc',
  'rewriteSelection',
  'writeUnitTests'
] as const

export const BLACKLIST_CHROME_LOGS_MATCHES: string[] = [
  'Download the React DevTools for a better development experience',
  'If you want to write it to the DOM, pass a string instead',
  '[vite]'
]

export const MAX_IMPORT_LINES_TO_USE = 5 as const
export const PROMPT_CACHE_DIR = join(process.cwd(), '.seraphim', 'cache')
