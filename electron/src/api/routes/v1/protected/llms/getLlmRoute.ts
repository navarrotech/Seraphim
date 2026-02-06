// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { sanitizeLlm } from './llmSanitizer'

type RouteParams = {
  llmId: string
}

const llmParamsSchema = z.object({
  llmId: z.string().trim().min(1),
})

export async function handleGetLlmRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Get llm API')

  const routeParams = parseRequestParams(
    llmParamsSchema,
    request,
    response,
    {
      context: 'Get llm API',
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
      console.debug('Llm get failed, llm not found', {
        llmId,
      })
      response.status(404).json({ error: 'Llm not found' })
      return
    }

    response.status(200).json({
      llm: sanitizeLlm(llm),
    })
  }
  catch (error) {
    console.error('Failed to get llm', error)
    response.status(500).json({ error: 'Failed to get llm' })
  }
}
