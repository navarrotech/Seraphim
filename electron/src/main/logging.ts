// Copyright © 2026 Jalapeno Labs

// Use type-only import via inline import to avoid runtime import
import type { ChalkInstance } from 'chalk'
import type { LogLevel, IpcLogEvent } from '@common/types'

// Core
import { app, ipcMain } from 'electron'
import logger from 'electron-log/main'
import chalk from 'chalk'

// Utility
import stripAnsi from 'strip-ansi'
import ansiRegex from 'ansi-regex'
import { isProduction } from '../env'
import { Seraphim } from '@common/constants'

// Always log color to stdout if possible! :)
if (process.stdout.isTTY) {
  process.env.FORCE_COLOR = process.env.FORCE_COLOR || '1'
}

// By default, logs are written to the following locations:
// on Linux: ~/.config/{app name}/logs/main.log
// on macOS: ~/Library/Logs/{app name}/main.log
// on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\main.log
logger.transports.file.maxSize = 10 * 1024 * 1024 // 10 MB (default is 1 mb)
logger.initialize()
logger.errorHandler.startCatching()

Object.assign(console, logger.functions)

// See the color rules in README.md
const colorByLogLevel: Record<LogLevel, ChalkInstance | null> = {
  'log': null,
  'info': null,
  'warn': chalk.yellow,
  'error': chalk.red,
  'debug': chalk.gray,
  'silly': chalk.gray,
  'verbose': chalk.gray,
}

const LOG_MESSAGES_BLACKLIST_BY_INCLUDES = [
  'Download the React DevTools for a better development experience',
  '[vite]',
  '[REDUX STATE]',
  // These errors come from an internal Devtools issue with Electron.
  // They are safe to ignore:
  'Request Autofill.enable failed',
  'Request Autofill.setAddress failed',
  'DeprecationWarning: fs.Stats constructor is deprecated',
] as const

// Capture log events from the renderer process
ipcMain.on('log', (_, { level, message, from }: IpcLogEvent) => {
  const isBlacklisted = LOG_MESSAGES_BLACKLIST_BY_INCLUDES.some(
    (blacklistItem) => message.includes(blacklistItem),
  )

  if (isBlacklisted) {
    return
  }

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
  console.debug(`[${from}]: ${message}`)
})


// Log messages to the console
logger.hooks.push((message, transport) => {
  if (transport === logger.transports.console) {
    // clone to avoid mutating the original array (used by other transports)
    const data = [ ...message.data ]
    const color = colorByLogLevel[message.level as LogLevel]
    // colorize only string args that aren't already colorized
    message.data = data.map((item) =>
      typeof item === 'string'
        && color
        && !ansiRegex().test(item)
        && !item.startsWith('mooreslabai [target]') // <-- The --help menu
        && !item.startsWith('⚙️') // <-- Child Process stdout logging
        && !item.startsWith('⚠️') // <-- Child Process stderr logging
        ? color(item)
        : item,
    )
  }
  else if (transport === logger.transports.file) {
    message.data = message.data.map((item) =>
      typeof item === 'string'
        ? stripAnsi(item)
        : item,
    )
  }

  return message
})

export function disableStdout() {
  // Disable all console logging
  logger.transports.console.level = false
}

export function applyLogLevel(verbose: boolean) {
  if (!verbose && isProduction) {
    logger.transports.console.level = 'info'
  }
  else {
    logger.transports.console.level = 'silly'
  }
}

export function logWelcome() {
  console.log(Seraphim)

  if (!isProduction) {
    console.log(
      chalk.yellow('DEVELOPMENT MODE'),
    )
    return
  }

  console.log(
    chalk.magenta(
      `Version ${chalk.magentaBright('v' + app.getVersion())}`,
    ),
  )
}

export {
  logger,
}
