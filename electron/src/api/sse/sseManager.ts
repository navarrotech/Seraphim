// Copyright © 2026 Jalapeno Labs

import type { Response } from 'express'

// Core
import { randomUUID } from 'node:crypto'

type SseClient = {
  clientId: string
  response: Response
}

function createSseManager() {
  const clientsById = new Map<string, SseClient>()

  function registerClient(response: Response): string {
    const clientId = randomUUID()
    clientsById.set(clientId, { clientId, response })
    return clientId
  }

  function removeClient(clientId: string): void {
    if (!clientsById.has(clientId)) {
      console.debug('SSE client removal requested for unknown client', { clientId })
      return
    }

    clientsById.delete(clientId)
  }

  function broadcastEvent(eventName: string, data: string): void {
    if (clientsById.size === 0) {
      console.debug('SSE broadcast skipped because no clients are connected', { eventName })
      return
    }

    const payload = formatSseEvent(eventName, data)
    for (const client of clientsById.values()) {
      client.response.write(payload)
    }
  }

  function getClientCount(): number {
    return clientsById.size
  }

  return {
    registerClient,
    removeClient,
    broadcastEvent,
    getClientCount,
  } as const
}

export function formatSseEvent(eventName: string, data: string): string {
  return `event: ${eventName}\ndata: ${data}\n\n`
}

export const sseManager = createSseManager()
