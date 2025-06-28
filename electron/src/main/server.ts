// Copyright © 2025 Jalapeno Labs

import type { WsToServerMessage } from '@common/types'

// Core
import express from 'express'
import expressWs from 'express-ws'
import http from 'http'

// Lib
import logger from 'electron-log'
import { safeParseJson } from '@common/json'

// Redux
import { dispatch } from '../lib/redux-store'
import { dataActions } from '../dataReducer'

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
      logger.error('Received invalid JSON from Chrome WebSocket:', event.toString())
      return
    }

    // TODO: Add validation in the future

    asJson.source = sessionId

    dispatch(
      dataActions.addChromeLogs(asJson)
    )
  })

  websocket.on('close', () => {
    // Clear the active Chrome state for this source
    dispatch(
      dataActions.clearChromeLogsForSource(sessionId)
    )
  })
})

app.ws('/seraphim/:sourceName/vscode', (websocket, request) => {
  const sourceName = request.params.sourceName
  websocket.on('message', (event) => {
    const asJson: WsToServerMessage<'vscode'> = safeParseJson(event.toString())
    if (!asJson) {
      logger.error('Received invalid JSON from VS Code WebSocket:', event.toString())
      return
    }

    dispatch(
      dataActions.setActiveVsCodeState(asJson)
    )
  })

  websocket.on('close', () => {
    // Clear the active VS Code state for this source
    dispatch(
      dataActions.clearActiveVsCodeStateForSource(sourceName)
    )
  })
})

let net: http.Server
export function startServer() {
  if (net) {
    logger.warn('Server is already running.')
    return
  }

  net = server.listen(PORT, () => {
    logger.log(`Server is running on port ${PORT}`)
  })
}

export function stopServer() {
  if (!net) {
    logger.warn('Server is not running.')
    return
  }

  net.close(() => {
    logger.log('Server has been stopped.')
    net = null
  })
}
