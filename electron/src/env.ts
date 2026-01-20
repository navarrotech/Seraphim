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
