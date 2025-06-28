// Copyright © 2025 Jalapeno Labs

import type { ChalkInstance } from 'chalk'
import type { LogLevel, IpcLogEvent } from '@common/types'

// Core
import { ipcMain } from 'electron'
import logger from 'electron-log/main'
import chalk from 'chalk'

// Redux
import { dispatch } from '../lib/redux-store'
import { dataActions } from '../dataReducer'

// Utility
import { stringify } from '@common/stringify'

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

logger.hooks = [
  ...logger.hooks,
  (message) => {
    if (message?.level === 'warn') {
      dispatch(
        dataActions.pushWarning(
          stringify(...message.data)
        )
      )
    }
    if (message?.level === 'error') {
      dispatch(
        dataActions.pushError(
          stringify(...message.data)
        )
      )
    }
    return message
  }
]

logger.errorHandler.startCatching()
