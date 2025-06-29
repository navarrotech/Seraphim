// Copyright © 2025 Jalapeno Labs

function isDev() {
  if (!process.mainModule) {
    return true
  }
  return process.mainModule?.filename.indexOf('app.asar') === -1
}

export const isProduction = !isDev()
console.info('Running in production mode:', isProduction)
