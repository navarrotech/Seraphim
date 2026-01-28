// Copyright © 2026 Jalapeno Labs

import type { Response } from 'express'

// Misc
import { formatSseEvent } from './sseManager'

type BuildClient = {
  response: Response
}

function createBuildJobManager() {
  const clientsByJobId = new Map<string, Set<BuildClient>>()

  function registerClient(jobId: string, response: Response): void {
    const clients = clientsByJobId.get(jobId) ?? new Set<BuildClient>()
    clients.add({ response })
    clientsByJobId.set(jobId, clients)
  }

  function removeClient(jobId: string, response: Response): void {
    const clients = clientsByJobId.get(jobId)
    if (!clients) {
      return
    }

    for (const client of clients) {
      if (client.response === response) {
        clients.delete(client)
      }
    }

    if (clients.size === 0) {
      clientsByJobId.delete(jobId)
    }
  }

  function broadcast(jobId: string, eventName: string, payload: unknown): void {
    const clients = clientsByJobId.get(jobId)
    if (!clients || clients.size === 0) {
      console.debug('Build SSE broadcast skipped because no clients are connected', {
        eventName,
        jobId,
      })
      return
    }

    let data = ''
    try {
      data = JSON.stringify(payload)
    }
    catch (error) {
      console.debug('Build SSE payload failed to serialize', { eventName, jobId })
      console.error(error)
      return
    }

    const formatted = formatSseEvent(eventName, data)
    for (const client of clients) {
      client.response.write(formatted)
    }
  }

  function finalizeJob(jobId: string): void {
    const clients = clientsByJobId.get(jobId)
    if (!clients) {
      return
    }

    for (const client of clients) {
      client.response.end()
    }

    clientsByJobId.delete(jobId)
  }

  return {
    registerClient,
    removeClient,
    broadcast,
    finalizeJob,
  } as const
}

export const buildJobManager = createBuildJobManager()
