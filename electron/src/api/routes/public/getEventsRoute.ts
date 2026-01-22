// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Misc
import { formatSseEvent, sseManager } from '../../sse/sseManager'

function initializeSseResponse(response: Response): void {
  response.status(200)
  response.setHeader('Content-Type', 'text/event-stream')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.setHeader('X-Accel-Buffering', 'no')
  response.flushHeaders()
}

export function handleGetEventsRequest(request: Request, response: Response): void {
  initializeSseResponse(response)

  const clientId = sseManager.registerClient(response)
  response.write(formatSseEvent('connected', 'ok'))

  function handleClose() {
    sseManager.removeClient(clientId)
    response.end()
  }

  request.on('close', handleClose)
}
