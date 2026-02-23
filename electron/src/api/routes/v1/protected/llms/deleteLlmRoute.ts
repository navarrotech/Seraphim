// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { LlmWithRateLimits } from '@common/types'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { sanitizeLlm } from './utils'

type RouteParams = {
  llmId: string
}

const llmParamsSchema = z.object({
  llmId: z.string().trim().min(1),
})

export async function handleDeleteLlmRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Delete llm API')

  const routeParams = parseRequestParams(
    llmParamsSchema,
    request,
    response,
    {
      context: 'Delete llm API',
      errorMessage: 'Llm ID is required',
    },
  )
  if (!routeParams) {
    return
  }

  const { llmId } = routeParams

  try {
    const existingLlm = await databaseClient.llm.findUnique({
      where: { id: llmId },
    })

    if (!existingLlm) {
      console.debug('Llm delete failed, llm not found', {
        llmId,
      })
      response.status(404).json({ error: 'Llm not found' })
      return
    }

    await databaseClient.llm.delete({
      where: { id: llmId },
    })

    broadcastSseChange({
      type: 'delete',
      kind: 'llms',
      data: sanitizeLlm(existingLlm) as LlmWithRateLimits,
    })

    response.status(200).json({ deleted: true, llmId })
  }
  catch (error) {
    console.error('Failed to delete llm', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to delete llm' })
    }
  }
}
