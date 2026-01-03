// Copyright © 2026 Jalapeno Labs

import 'dotenv/config'
import dotenv from 'dotenv'
import { resolve } from 'path'

function isDev() {
  if (!process.mainModule) {
    return true
  }
  return process.mainModule?.filename.indexOf('app.asar') === -1
}

export const isProduction = !isDev()
console.info('Running in production mode:', isProduction)

// In dev, the environment variables are loaded from the parent directory
if (!isProduction) {
  dotenv.config({
    path: resolve(process.cwd(), '..', '.env'),
  })
}

// This is NOT required, but it is used as the "default" API key
// If not set, the it will need to be defined in the seraphim config file per-project
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.warn(`The OPENAI_API_KEY is not set in the environment!
The end user will be required to enter openai key into each seraphim project configuration file.
  `.trim())
}
