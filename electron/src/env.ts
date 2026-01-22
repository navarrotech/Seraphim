// Copyright © 2026 Jalapeno Labs

import 'dotenv/config'
import { parseEnvInt } from '@common/envKit'

function isDev() {
  if (!process.mainModule) {
    return true
  }
  return process.mainModule?.filename.indexOf('app.asar') === -1
}

export const isProduction = !isDev()

export const DATABASE_URL = process.env.DATABASE_URL || ''
export const API_PORT = parseEnvInt(process.env.API_PORT, 990)

if (!API_PORT) {
  throw Error('API server failed to start due to invalid API_PORT')
}

if (API_PORT <= 0) {
  throw new Error('API_PORT must be a positive integer')
}
