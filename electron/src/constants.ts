// Copyright © 2026 Jalapeno Labs

// Misc
import { SUPPORTED_MODELS_BY_LLM } from '@common/constants'

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

export { SUPPORTED_MODELS_BY_LLM }
