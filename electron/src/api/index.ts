// Copyright © 2026 Jalapeno Labs

import type { Server } from 'node:http'

// Core
import { createServer } from 'node:http'

// Misc
import { API_PORT } from '../env'
import { logFailed, logSuccess, logWarning } from '../lib/logging'
import { createApiApp } from './express'

let apiServer: Server | null = null

export async function startApi(): Promise<Server | null> {
  if (apiServer) {
    logWarning('API server already running, skipping start')
    return apiServer
  }

  const apiApplication = createApiApp()
  const apiServerInstance = createServer(apiApplication)
  apiServer = apiServerInstance

  await new Promise<void>(function waitForListen(resolve, reject) {
    function handleListening() {
      logSuccess(`API server listening on port ${API_PORT}`)
      resolve()
    }

    function handleError(error: Error) {
      logFailed('API server failed to start')
      console.error(error)
      reject(error)
    }

    apiServerInstance.once('listening', handleListening)
    apiServerInstance.once('error', handleError)
    apiServerInstance.listen(API_PORT)
  })

  return apiServerInstance
}

export async function stopApi(): Promise<void> {
  if (!apiServer) {
    logWarning('API stop requested, but no server is running')
    return
  }

  const serverToClose = apiServer
  apiServer = null

  await new Promise<void>(function waitForClose(resolve, reject) {
    function handleClose(error?: Error) {
      if (error) {
        logFailed('API server failed to stop cleanly')
        console.error(error)
        reject(error)
        return
      }

      logSuccess('API server stopped')
      console.info({ port: API_PORT })
      resolve()
    }

    serverToClose.close(handleClose)
  })
}
