// Copyright © 2026 Jalapeno Labs

import type { LlmConnectionType } from '@prisma/client'

export const API_BASE_PATH = '/api/v1'
export const API_DEFAULT_PORT = 9900

export const DEV_FRONTEND_ORIGIN = 'http://localhost:5173'
export const APP_PROTOCOL = 'app'
export const APP_HOSTNAME = 'seraphim'
export const APP_ORIGIN = `${APP_PROTOCOL}://${APP_HOSTNAME}`

export const TRANSCRIBER_BASE_URL = 'http://localhost:9901'
export const TRANSCRIBER_START_PATH = 'transcribe/start'
export const TRANSCRIBER_STOP_PATH = 'transcribe/stop'

export const GITHUB_OAUTH_DEFAULT_SCOPES = [
  'read:user',
  'user:email',
  'public_repo',
  'repo',
  'read:org',
] as const
export const DEFAULT_OAUTH_STATE_TTL_MINUTES = 10

export const IPC_SIGNALS = {
  getApiUrl: 'get-api-url',
  exitApp: 'exit-app',
} as const

export const SUPPORTED_MODELS_BY_LLM = {
  OPENAI_API_KEY: [
    'gpt-5.2-codex',
    'gpt-5.1-codex-mini',
    'gpt-5.1-codex-max',
    'gpt-5.2',
    'gpt-5.1',
    'gpt-5.1-codex',
    'gpt-5-codex',
    'gpt-5-codex-mini',
    'gpt-5',
  ],
  OPENAI_LOGIN_TOKEN: [
    'gpt-5.2-codex',
    'gpt-5.1-codex-mini',
    'gpt-5.1-codex-max',
    'gpt-5.2',
    'gpt-5.1',
    'gpt-5.1-codex',
    'gpt-5-codex',
    'gpt-5-codex-mini',
    'gpt-5',
  ],
  KIMI_API_KEY: [ 'kimi-k2' ],
} as const satisfies Record<LlmConnectionType, readonly string[]>
