// Copyright © 2025 Jalapeno Labs

import logger from 'electron-log'

function isDev() {
  if (!process.mainModule) {
    return true
  }
  return process.mainModule?.filename.indexOf('app.asar') === -1
}

export const isProduction = !isDev()
logger.info('Running in production mode:', isProduction)
