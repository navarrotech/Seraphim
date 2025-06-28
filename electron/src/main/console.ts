// Copyright © 2025 Jalapeno Labs

import type { SystemStatus } from '@common/types'
import type { RootState } from '../lib/redux-store'
import type { ChalkInstance } from 'chalk'

// Core
import chalk from 'chalk'
import logger from 'electron-log'
import { getState } from '../lib/redux-store'

// Utiltiy
import { capitalize } from 'lodash-es'
import { PORT } from '@common/constants'

export function resetConsole() {
  console.clear()
  console.log('\n\n\n\n')

  const state = getState()

  logServerStatus(state)
  // logDatabaseStatus(state)
  logChromeLoggingStatus(state)
  logVscodeWorkspaceStatus(state)
  logCurrentJobs(state)

  logErrorOrWarning(state.data.errors, chalk.red, 'Errors:')
  logErrorOrWarning(state.data.warnings, chalk.yellow, 'Warnings:')

  logger.log('\n')
}

function logServerStatus(state: RootState) {
  const { serverStatus } = state.data
  logger.log(`+ Server on port ${PORT}: ${colorStatus(serverStatus)}`)
}

// function logDatabaseStatus(state: RootState) {
//   const { databaseName } = state.data
//   logger.log(`Database connected: ${chalk.blue(databaseName)}`)
// }

function logChromeLoggingStatus(state: RootState) {
  const { chromeLogsByPage } = state.data

  const totalPages = Object.keys(chromeLogsByPage).length
  logger.log(`+ Chrome: ${chalk.blue(totalPages)} pages connected`)

  for (const [ source, logs ] of Object.entries(chromeLogsByPage)) {
    logger.log(`  > ${logs.length} logs total from ${chalk.blue(source)}`)
  }
}

function logVscodeWorkspaceStatus(state: RootState) {
  const { activeVsCodeState, vsCodeConnectionsByWorkspace } = state.data

  const totalConnections = Object.keys(vsCodeConnectionsByWorkspace).length
  logger.log(`+ VS Code: ${chalk.blue(totalConnections)} workspaces connected`)

  for (const [ workspaceName ] of Object.entries(vsCodeConnectionsByWorkspace)) {
    logger.log(`  > ${chalk.blue(workspaceName)} connected`)
  }

  logger.log(`+ Target VsCode workspace: ${activeVsCodeState
    ? chalk.blue(activeVsCodeState.workspaceName)
    : 'None'}
  `.trim())
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logCurrentJobs(state: RootState) {
  // TODO: Implement current jobs logging
}

function logErrorOrWarning(messages: Set<string>, color: ChalkInstance, prefix: string) {
  if (!messages.size) {
    return
  }
  logger.error(prefix)
  for (const error of messages) {
    logger.warn(`  - ${color(error)}`)
  }
}

const colorByStatus: Record<SystemStatus, ChalkInstance> = {
  operational: chalk.green,
  degraded: chalk.yellow,
  failure: chalk.red,
  offline: chalk.gray
}

export function colorStatus(status: SystemStatus) {
  const whichChalk = colorByStatus[status]
  const statusCapitalized = capitalize(status)
  if (!whichChalk) {
    logger.warn(`Unknown status: ${status}. Defaulting to gray.`)
    return chalk.gray(statusCapitalized)
  }
  return whichChalk(statusCapitalized)
}
