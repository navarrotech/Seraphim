// Copyright © 2026 Jalapeno Labs

import type { WsToServerMessage } from '@common/types'

// Core
import chalk from 'chalk'
import express from 'express'
import expressWs from 'express-ws'
import http from 'http'

// Lib
import { safeParseJson } from '@common/json'

// Redux
import { dispatch } from '@common/redux/store'
import { contextActions } from '@common/redux/stores/context'

// Misc
import { v7 as uuid } from 'uuid'
import { PORT } from '@common/constants'

const vanillaApp = express()
const server = http.createServer(vanillaApp)
const { app } = expressWs(vanillaApp, server)

app.all('/', (request, response) => {
  response.status(200).send('Hello from the Seraphim server!')
})

app.ws('/seraphim/:sourceName/chrome', (websocket, request) => {
  const sourceName = request.params.sourceName
  const sessionId = sourceName + '@' + uuid()

  // Need to use a session id because Chrome cannot distinguish between multiple tabs

  websocket.on('message', (event) => {
    const asJson: WsToServerMessage<'chrome'> = safeParseJson(event.toString())
    if (!asJson) {
      console.error('Received invalid JSON from Chrome WebSocket:', event.toString())
      return
    }

    // TODO: Add validation in the future

    asJson.source = sessionId

    dispatch(
      contextActions.addChromeLogs(asJson),
    )
  })

  websocket.on('close', () => {
    // Clear the active Chrome state for this source
    dispatch(
      contextActions.clearChromeLogsForSource(sessionId),
    )
  })
})

app.ws('/seraphim/:sourceName/vscode', (websocket, request) => {
  const sourceName = request.params.sourceName
  websocket.on('message', (event) => {
    const asJson: WsToServerMessage<'vscode'> = safeParseJson(event.toString())
    if (!asJson) {
      console.error('Received invalid JSON from VS Code WebSocket:', event.toString())
      return
    }

    dispatch(
      contextActions.setActiveVsCodeState(asJson),
    )
  })

  websocket.on('close', () => {
    // Clear the active VS Code state for this source
    dispatch(
      contextActions.clearActiveVsCodeStateForSource(sourceName),
    )
  })
})

let net: http.Server
export async function startServer() {
  if (net) {
    console.warn(chalk.redBright('Server is already running.'))
    return null
  }

  return new Promise((resolve, reject) => {
    function onError(error: Error) {
      server.off('error', onError)
      console.error(chalk.red('Failed to start server:'), error)
      reject(error)
    }
    server.on('error', onError)

    net = server.listen(PORT, () => {
      console.log(chalk.green(`Server is running on port ${PORT}`))
      resolve(true)
    })
  })
}

export function stopServer() {
  if (!net) {
    console.warn(chalk.redBright('Cannot stop server, server is not running.'))
    return
  }

  net.close(() => {
    console.log(chalk.green('Server has been stopped.'))
    net = null
  })
}
