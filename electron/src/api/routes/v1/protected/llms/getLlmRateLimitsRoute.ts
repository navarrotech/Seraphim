// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { getLlmRateLimits } from '@common/llms/call'

type RouteParams = {
  llmId: string
}

const llmParamsSchema = z.object({
  llmId: z.string().trim().min(1),
})

export async function handleGetLlmRateLimitsRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Get llm rate limits API')

  const routeParams = parseRequestParams(
    llmParamsSchema,
    request,
    response,
    {
      context: 'Get llm rate limits API',
      errorMessage: 'Llm ID is required',
    },
  )
  if (!routeParams) {
    return
  }

  const { llmId } = routeParams

  try {
    const llm = await databaseClient.llm.findUnique({
      where: { id: llmId },
    })

    if (!llm) {
      console.debug('Llm rate limits get failed, llm not found', {
        llmId,
      })
      response.status(404).json({ error: 'Llm not found' })
      return
    }

    const rateLimits = await getLlmRateLimits(llm)

    response.status(200).json({
      llmId: llm.id,
      rateLimits,
    })
  }
  catch (error) {
    console.error('Failed to get llm rate limits', error)
    response.status(500).json({ error: 'Failed to get llm rate limits' })
  }
}
