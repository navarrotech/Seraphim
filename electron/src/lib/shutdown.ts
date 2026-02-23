// Copyright © 2026 Jalapeno Labs

// Core
import { app } from 'electron'

// Lib
import { stopApi } from '../api'
import { stopDatabase } from '../database'
import { disconnectFromDocker } from '../docker/docker'

let isShuttingDown = false

export async function gracefulShutdown(exitCode: number = 0, reason?: string) {
  // Prevent multiple calls to this function
  if (isShuttingDown) {
    console.debug('Graceful shutdown already in progress', { exitCode, reason })
    return
  }
  isShuttingDown = true

  console.info('Graceful shutdown initiated', { exitCode, reason })

  const forceExitTimer = setTimeout(() => {
    console.warn('Graceful shutdown timed out, forcing exit')
    process.exit(exitCode)
  }, 10_000)
  forceExitTimer.unref?.()

  await Promise.allSettled([
    disconnectFromDocker(),
    stopDatabase(),
    stopApi(),
  ])

  console.info('Graceful shutdown complete')
  app.quit()
}

function handleProcessSignal(signal: NodeJS.Signals): void {
  console.info('Process signal received', { signal })
  gracefulShutdown(0, signal)
}

process.on('SIGINT', handleProcessSignal)
process.on('SIGTERM', handleProcessSignal)
process.on('SIGQUIT', handleProcessSignal)
process.on('SIGHUP', handleProcessSignal)
process.on('uncaughtException', async function ElectronGracefulShutdown(error) {
  if (error instanceof Error) {
    console.error('Fatal electron crash', error)
  }

  await gracefulShutdown(1, 'uncaughtException')
})

process.on('unhandledRejection', async function ElectronUnhandledRejection(reason: any) {
  console.error('Fatal', reason)
  await gracefulShutdown(1, 'unhandledRejection')
})
