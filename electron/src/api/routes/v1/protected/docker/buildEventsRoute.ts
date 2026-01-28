// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestQuery } from '../../validation'
import { buildJobManager } from '@electron/api/sse/buildJobManager'
import { formatSseEvent } from '@electron/api/sse/sseManager'

const buildEventsSchema = z.object({
  jobId: z.string().trim().min(1),
})

type BuildEventsQuery = z.infer<typeof buildEventsSchema>

function initializeSseResponse(response: Response): void {
  response.status(200)
  response.setHeader('Content-Type', 'text/event-stream')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.setHeader('X-Accel-Buffering', 'no')
  response.flushHeaders()
}

export function handleBuildEventsRequest(
  request: Request,
  response: Response,
): void {
  const query = parseRequestQuery<BuildEventsQuery>(
    buildEventsSchema,
    request,
    response,
    {
      context: 'Build events stream',
      errorMessage: 'Invalid build events request',
    },
  )

  if (!query) {
    console.debug('Build events request failed validation')
    return
  }

  initializeSseResponse(response)
  buildJobManager.registerClient(query.jobId, response)
  response.write(formatSseEvent('connected', JSON.stringify({ jobId: query.jobId })))

  function handleClose() {
    buildJobManager.removeClient(query.jobId, response)
    response.end()
  }

  request.on('close', handleClose)
}
