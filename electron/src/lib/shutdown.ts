// Copyright © 2026 Jalapeno Labs

// Core
import { app } from 'electron'

// Lib
import { stopApi } from '../api'
import { stopDatabase } from '../database'

let isShuttingDown = false
export async function gracefulShutdown(exitCode: number = 0) {
  // Prevent multiple calls to this function
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true

  console.info('Graceful shutdown initiated with exit code', exitCode)

  const forceExitTimer = setTimeout(() => {
    console.warn('Graceful shutdown timed out, forcing exit')
    process.exit(exitCode)
  }, 10_000)
  forceExitTimer.unref?.()

  await Promise.allSettled([
    stopDatabase(),
    stopApi(),
  ])

  console.info('Graceful shutdown complete')
  app.quit()
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
process.on('SIGQUIT', gracefulShutdown)
process.on('SIGHUP', gracefulShutdown)
process.on('exit', gracefulShutdown)
process.on('uncaughtException', async function ElectronGracefulShutdown(error) {
  if (error instanceof Error) {
    console.error('Fatal electron crash', error)
  }

  await gracefulShutdown()
})

process.on('unhandledRejection', async function ElectronUnhandledRejection(reason: any) {
  console.error('Unhandled promise rejection', reason)
  await gracefulShutdown(1)
})
