// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Misc
import {
  formatSseEvent,
  initializeSseResponse,
  sseManager,
} from '../../sse/sseManager'

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
