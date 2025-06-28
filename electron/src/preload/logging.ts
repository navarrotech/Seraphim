// Copyright © 2025 Jalapeno Labs

// Core
import { ipcRenderer } from 'electron'

// Typescript
import type { LogLevel, BridgedLogFunction, IpcLogEvent } from '@common/types'

export const preloadLogger: BridgedLogFunction = (level: LogLevel, ...messages: any[]) => {
  const message = messages.map((message) => {
    if (message instanceof Error) {
      return `Error: ${message.name} - ${message.message}\nStack: ${message.stack}`
    }

    if (typeof message === 'object') {
      try {
        return JSON.stringify(message, null, 2)
      }
      catch {
        return `[Object: ${String(message)}]`
      }
    }

    return String(message)
  }).join(' ')

  const event: IpcLogEvent = {
    from: 'renderer',
    level,
    message
  }

  // This will send the log event to the main process
  ipcRenderer.send('log', event)
}
