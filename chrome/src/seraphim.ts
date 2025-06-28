// Copyright © 2025 Jalapeno Labs

import type { WsToServerMessage, ChromeLogPayload, LogLevel } from '@common/types'

// Core
import ReconnectingWebsocket from 'reconnecting-websocket'
import { PORT } from '@common/constants'

// Lib
import { debounce } from 'lodash'
import { stringify } from '@common/stringify'
import { v7 as uuid } from 'uuid'

// //////////////////////////// //
//            Globals           //
// //////////////////////////// //

const websocketUri = `ws://localhost:${PORT}/seraphim/chrome`
const rws = new ReconnectingWebsocket(websocketUri, [], {
  debug: false
})
const buffer: ChromeLogPayload[] = []

// override the error handler so it never throws or logs
rws.onerror = () => {
  // No-op
}

// //////////////////////////// //
//           Utilities          //
// //////////////////////////// //

function send(payload: WsToServerMessage<'chrome'>['payload']): boolean {
  if (rws.readyState !== ReconnectingWebsocket.OPEN) {
    console.log('WebSocket is not open, cannot send update')
    return false
  }

  const message: WsToServerMessage<'chrome'> = {
    id: uuid(),
    source: window.location.href,
    timestamp: Date.now(),
    payload
  }

  try {
    rws.send(
      JSON.stringify(message)
    )
  }
  catch {
    return false
  }

  return true
}

function sendChromeLogReport() {
  const bufferCopy = [ ...buffer ]
  buffer.length = 0

  const sent = send({
    type: 'chrome-log-report',
    logs: bufferCopy
  })

  // Clear the buffer if sent successfully
  if (!sent) {
    buffer.unshift(...bufferCopy)
  }
}

const sendDebouncedChromeLogReport = debounce(sendChromeLogReport, 100)

rws.addEventListener('open', () => {
  sendChromeLogReport()
})

function isErrorSelf(message: string): boolean {
  return message.includes(websocketUri)
}

window.addEventListener('error', (event) => {
  // Build “message at file:line:col” plus stack if available
  const message = stringify(event.error)

  if (isErrorSelf(message)) {
    // Ignore errors that are self-referential (e.g., from this script)
    return
  }

  buffer.push({
    timestamp: Date.now(),
    type: 'error',
    message
  })

  sendDebouncedChromeLogReport()
})

window.addEventListener('unhandledrejection', (event) => {
  // Pull out reason (could be anything)
  const message = stringify(event.reason)

  if (isErrorSelf(message)) {
    // Ignore errors that are self-referential (e.g., from this script)
    return
  }

  buffer.push({
    timestamp: Date.now(),
    type: 'error',
    message
  })

  sendDebouncedChromeLogReport()
})

// ////////////////////////////
// Monkey-patch console methods
// ////////////////////////////

const methods: LogLevel[] = [ 'log', 'info', 'debug', 'warn', 'error' ]

methods.forEach((level) => {
  // Keep a reference to the original
  const original = console[level] as (...args: unknown[]) => void

  console[level] = (...args: unknown[]) => {
    // Turn args into a single string
    const message = stringify(args)

    if (isErrorSelf(message)) {
      // Ignore messages that are self-referential (e.g., from this script)
      return
    }

    buffer.push({
      timestamp: Date.now(),
      type: level,
      message
    })

    // Still log to the real console
    original.apply(console, args)
  }

  sendDebouncedChromeLogReport()
})
