// Copyright © 2025 Jalapeno Labs

import type {
  SeraphimProjectConfiguration,
  ActionContext,
  ActionKeys,
  WorkspaceSource,
  ChromeLogPayload,
  FunctionPointer
} from './types'

// Core
import { GlobalKeyboardListener } from 'node-global-key-listener'
import { getProjectConfig, logConfig } from './projectConfig'
import { getAllVsCodeWorkspaces } from './vscode'

// Actions
import { showHelp } from './actions/help'
import { analyzeError } from './actions/analyzeError'
import { writeJsDoc } from './actions/JSDoc'
import { rewriteSelection } from './actions/rewrite'
import { writeUnitTests } from './actions/writeUnitTests'

// Lib
import { v7 as uuid } from 'uuid'
import chalk from 'chalk'
import humanizeDuration from 'humanize-duration'

// Utility
import { getLogsForTab } from './server'
import { getDockerLogs } from './docker'
import { extractSourceCodeReferencedInErrors, getSourceCode } from './sourceCode'

const keyEvents = new GlobalKeyboardListener()

const ActionsByKey: Record<ActionKeys, (context: ActionContext) => Promise<void>> = {
  analyzeError,
  writeJsDoc,
  rewriteSelection,
  writeUnitTests
}

export function startListeningForKeyEvents() {
  keyEvents.addListener(function handleKeydown(event, down) {
    if (event.state != 'DOWN') {
      return false
    }

    const isACtrlDown = down['LEFT CTRL'] || down['RIGHT CTRL']
    if (!down['ALT'] && !isACtrlDown) {
      return false
    }

    switch (event.name) {
    case 'NUMPAD MINUS':
      showHelp()
      break
    case 'NUMPAD 5':
      collectContextAndPerformAction('rewriteSelection')
      break
    case 'NUMPAD 6':
      collectContextAndPerformAction('writeJsDoc')
      break
    case 'NUMPAD 7':
      collectContextAndPerformAction('analyzeError', {
        chromeLogs: true,
        dockerLogs: true,
        terminalLogs: true,
        sourceCode: true
      })
      break
    case 'NUMPAD 9':
      collectContextAndPerformAction('writeUnitTests')
      break
    default:
      return false
    }

    return true
  })
}

// TODO: Add functionality to cancel existing running job?
type ContextOptions = {
  chromeLogs?: boolean
  dockerLogs?: boolean
  terminalLogs?: boolean
  sourceCode?: boolean
}
const defaultContextOptions: ContextOptions = {
  chromeLogs: false,
  dockerLogs: false,
  terminalLogs: false,
  sourceCode: false
}
async function collectContextAndPerformAction(action: ActionKeys, options: ContextOptions = {}): Promise<void> {
  options = Object.assign({}, defaultContextOptions, options)

  const id = uuid()
  const startedAt = Date.now()

  // /////////////////////////////// //
  //      Get VsCode Workspaces      //
  // /////////////////////////////// //

  const errors: string[] = []
  const allVsCodeWorkspaces = await getAllVsCodeWorkspaces()

  let config: SeraphimProjectConfiguration | undefined
  let vscodeWorkspace: WorkspaceSource
  for (const workspace of allVsCodeWorkspaces) {
    try {
      const targetConfig = getProjectConfig(workspace.absolutePath)

      // If the config doens't exist, set it as the target config
      // However, if the config is already set BUT the workspace is focused, that takes priority
      if (!config || workspace.isFocused) {
        config = targetConfig
        vscodeWorkspace = workspace
      }
    }
    catch (error) {
      errors.push(`Failed to get project config for ${workspace}: ${error.message}`)
    }
  }

  if (!config) {
    console.error(`Errors occurred while performing action '${action}':`)
    errors.forEach((error) => console.error(` - ${error}`))
    return
  }

  console.debug(`Targeting workspace: ${chalk.blue()}${vscodeWorkspace.workspaceName}${chalk.reset()}`)

  // if (vscodeWorkspace) {
  //   console.log(allVsCodeWorkspaces)
  //   console.log('early return')
  //   return
  // }

  logConfig(config)

  // /////////////////////////////// //
  //         Chrome Interface        //
  // /////////////////////////////// //

  let chromeLogs: ChromeLogPayload[]
  if (options.chromeLogs) {
    chromeLogs = await getLogsForTab(config.frontendUrl)
  }

  // /////////////////////////////// //
  //            Docker Logs          //
  // /////////////////////////////// //

  const dockerLogsByContainer: Record<string, string[]> = {}
  if (options.dockerLogs) {
    for (const containerName of config.dockerContainers) {
      dockerLogsByContainer[containerName] = await getDockerLogs(containerName)
    }
  }

  // /////////////////////////////// //
  //           Terminal Logs         //
  // /////////////////////////////// //

  if (options.terminalLogs) {
    // TODO: Implement terminal logs collection
  }

  // /////////////////////////////// //
  //            Source Code          //
  // /////////////////////////////// //

  const sourceFiles: Record<string, string> = {}
  const sourceFilePaths: FunctionPointer[] = []
  if (options.sourceCode) {
    const [ shouldProceed, paths ] = await extractSourceCodeReferencedInErrors(
      dockerLogsByContainer,
      chromeLogs,
      vscodeWorkspace.absolutePath,
      config
    )
    sourceFilePaths.push(...paths)

    console.debug(paths)

    if (!shouldProceed) {
      console.error(`${chalk.redBright('HALTING')}`)
      console.error('-- No source files found in the error logs --')
      return
    }

    for (const pointer of paths) {
      const fullPath = await getSourceCode(pointer)
      if (fullPath) {
        sourceFiles[pointer.absolutePath] = fullPath
      }
    }
  }

  // /////////////////////////////// //
  //      Putting it all together    //
  // /////////////////////////////// //
  const context: ActionContext = {
    id,
    vscodeWorkspace,
    sourceFiles,
    sourceFilePaths,
    dockerLogsByContainer,
    chromeLogs,
    config,
    startedAt
  }

  const preparedAt = Date.now()
  console.debug(`[ACTION]: Prepared action '${action}' in ${humanizeDuration(preparedAt - startedAt)}`)

  await ActionsByKey[action](context)

  const endAt = Date.now()
  console.debug(`[ACTION]: Completed action '${action}' in ${humanizeDuration(endAt - startedAt)} total`)
}
