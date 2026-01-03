// Copyright © 2026 Jalapeno Labs

import type { WsToServerMessage, ChromeLogPayload, LogLevel } from '@common/types'

// Core
import ReconnectingWebsocket from 'reconnecting-websocket'
import { PORT } from '@common/constants'

// Lib
import { stringify } from '@common/stringify'
import { v7 as uuid } from 'uuid'

console.log('Seraphim is watching this page\'s console output and errors.')

// //////////////////////////// //
//            Globals           //
// //////////////////////////// //

const websocketUri = `ws://localhost:${PORT}/seraphim/${window.location.host}/chrome`
const rws = new ReconnectingWebsocket(websocketUri, [], {
  debug: false,
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
    return false
  }

  const message: WsToServerMessage<'chrome'> = {
    id: uuid(),
    source: window.location.href,
    timestamp: Date.now(),
    payload,
  }

  try {
    rws.send(
      JSON.stringify(message),
    )
  }
  catch {
    return false
  }

  return true
}

function sendChromeLogReports() {
  if (rws.readyState !== ReconnectingWebsocket.OPEN) {
    return
  }

  if (!buffer.length) {
    return
  }

  for (const log of buffer) {
    const isSent = send({
      type: 'chrome-log-report',
      log,
    })
    if (isSent) {
      // If the message was sent successfully, remove it from the buffer
      const index = buffer.indexOf(log)
      if (index > -1) {
        buffer.splice(index, 1)
      }
    }
  }
}

rws.addEventListener('open', () => {
  sendChromeLogReports()
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
    message,
  })
  sendChromeLogReports()
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
    message,
  })
  sendChromeLogReports()
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
    const message = stringify(...args)

    if (isErrorSelf(message)) {
      // Ignore messages that are self-referential (e.g., from this script)
      return
    }

    buffer.push({
      timestamp: Date.now(),
      type: level,
      message,
    })

    // Still log to the real console
    original.apply(console, args)
    sendChromeLogReports()
  }
})
