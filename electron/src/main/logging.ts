// Copyright © 2025 Jalapeno Labs

// Core
import { ipcMain } from 'electron'
import logger from 'electron-log/main'
import chalk from 'chalk'

// Typescript
import type { ChalkInstance } from 'chalk'
import type { LogLevel } from '@common/types'
import type { IpcLogEvent } from '../types'

// By default, logs are written to the following locations:
// on Linux: ~/.config/{app name}/logs/main.log
// on macOS: ~/Library/Logs/{app name}/main.log
// on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\main.log
logger.initialize()

const reset = chalk.reset()
const colorByLogLevel: Record<LogLevel, ChalkInstance> = {
  'log': chalk.cyan,
  'info': chalk.blue,
  'warn': chalk.yellow,
  'error': chalk.red,
  'debug': chalk.gray
}

ipcMain.on('log', (_, { level, message, from }: IpcLogEvent) => {
  logger[level](`[${from}]: ${colorByLogLevel[level](message)}${reset}`)
})

logger.errorHandler.startCatching()
