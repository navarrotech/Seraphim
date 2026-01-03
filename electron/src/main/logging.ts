// Copyright © 2026 Jalapeno Labs

import type { ChalkInstance } from 'chalk'
import type { LogLevel, IpcLogEvent } from '@common/types'

// Core
import { ipcMain } from 'electron'
import logger from 'electron-log/main'
import chalk from 'chalk'

// Utility
import { isProduction } from '../env'

// By default, logs are written to the following locations:
// on Linux: ~/.config/{app name}/logs/main.log
// on macOS: ~/Library/Logs/{app name}/main.log
// on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\main.log
logger.transports.file.maxSize = 1 * 1024 * 1024 // 1 MB (default is 1 mb)
logger.initialize()
logger.errorHandler.startCatching()

Object.assign(console, logger.functions)

const colorByLogLevel: Record<LogLevel, ChalkInstance | null> = {
  'log': chalk.cyan,
  'info': null,
  'warn': chalk.yellow,
  'error': chalk.red,
  'debug': chalk.gray,
}

// Capture log events from the renderer process
ipcMain.on('log', (_, { level, message, from }: IpcLogEvent) => {
  if (isProduction) {
    // Write the renderer logs directly to the file transport
    logger.transports.file({
      date: new Date(),
      level: level as any,
      data: [ `[${from}]: ${message}` ],
    })
    return
  }

  // In development mode, re-log renderer logs to the console
  console.log(`[${from}]: ${message}`)
})


// Log Seraphim messages to the console
logger.hooks.push((message, transport) => {
  if (transport === logger.transports.console) {
    // clone to avoid mutating the original array (used by other transports)
    const data = [ ...message.data ]
    // colorize only string args
    message.data = data.map((item) =>
      typeof item === 'string' && colorByLogLevel[message.level]
        ? colorByLogLevel[message.level](item)
        : item,
    )
  }
  return message
})
