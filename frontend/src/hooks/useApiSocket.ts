// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect } from 'react'

// Misc
import { getApiRoot } from '../lib/api'

function logSseEvent(eventType: string, event: MessageEvent): void {
  console.debug('SSE event received', {
    eventType,
    data: event.data,
    lastEventId: event.lastEventId,
    origin: event.origin,
  })
}

function handleMessage(event: MessageEvent) {
  logSseEvent('message', event)
}

function handleConnected(event: MessageEvent) {
  logSseEvent('connected', event)
}

function handleCreate(event: MessageEvent) {
  logSseEvent('create', event)
}

function handleUpdate(event: MessageEvent) {
  logSseEvent('update', event)
}

function handleDelete(event: MessageEvent) {
  logSseEvent('delete', event)
}

export function useApiSocket(): void {
  useEffect(function manageApiSocket() {
    const apiRoot = getApiRoot()
    const eventSource = new EventSource(`${apiRoot}/events`)

    function handleError(event: Event) {
      console.debug('SSE error received', {
        event,
        readyState: eventSource.readyState,
      })
    }

    eventSource.addEventListener('message', handleMessage)
    eventSource.addEventListener('connected', handleConnected)
    eventSource.addEventListener('create', handleCreate)
    eventSource.addEventListener('update', handleUpdate)
    eventSource.addEventListener('delete', handleDelete)
    eventSource.addEventListener('error', handleError)

    return function cleanupApiSocket() {
      eventSource.removeEventListener('message', handleMessage)
      eventSource.removeEventListener('connected', handleConnected)
      eventSource.removeEventListener('create', handleCreate)
      eventSource.removeEventListener('update', handleUpdate)
      eventSource.removeEventListener('delete', handleDelete)
      eventSource.removeEventListener('error', handleError)
      eventSource.close()
    }
  }, [])
}
