// Copyright © 2026 Jalapeno Labs

import type { LlmWithRateLimits } from '@common/types'
import type { Request, Response } from 'express'
import type { UpdateLlmRequest } from '@common/schema/llm'

// Core
import { parseRequestBody, parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { z } from 'zod'

// Schema
import { updateLlmSchema } from '@common/schema/llm'
import { sanitizeLlm, setNewDefaultLlm } from './utils'
import { getCallableLLM } from '@common/llms/call'

type RouteParams = {
  llmId: string
}

const Params = z.object({
  llmId: z.string().trim().min(1),
})

export type RequestBody = UpdateLlmRequest

export async function handleUpdateLlmRequest(
  request: Request<RouteParams, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const prisma = requireDatabaseClient('Update llm API')

  const routeParams = parseRequestParams(
    Params,
    request,
    response,
    {
      context: 'Update llm API',
      errorMessage: 'Llm ID is required',
    },
  )
  if (!routeParams) {
    return
  }

  const body = parseRequestBody(
    updateLlmSchema,
    request,
    response,
    {
      context: 'Update llm API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!body) {
    return
  }

  const { llmId } = routeParams

  try {
    const existingLlm = await prisma.llm.findUnique({
      where: { id: llmId },
    })

    if (!existingLlm) {
      console.debug('Llm update failed, llm not found', {
        llmId,
      })
      response.status(400).json({ error: 'Llm not found' })
      return
    }

    const callableLlm = getCallableLLM(existingLlm)

    // Ensure that if the apiKey changed, the LLM is still valid/reachable!
    if (body.apiKey) {
      const [ isValid, errorMessage ] = await callableLlm.validateLlm()

      if (!isValid) {
        console.debug('Llm update rejected for unsupported apiKey change', {
          llmId,
          type: existingLlm.type,
          errorMessage,
        })
        response.status(400).json({
          error: errorMessage,
        })
        return
      }
    }

    const [ createdLlm, rateLimits ] = await Promise.all([
      prisma.llm.create({
        data: {
          user: {
            connect: {
              id: existingLlm.userId,
            },
          },
          type: body.type,
          name: body.name,
          preferredModel: body.preferredModel,
          apiKey: body.apiKey,
          tokenLimit: body.tokenLimit,
          isDefault: body.isDefault,
        },
      }),
      callableLlm.getRateLimits(),
    ])

    if (body.isDefault) {
      await setNewDefaultLlm(existingLlm.userId, llmId)
    }

    const llmWithRateLimits: LlmWithRateLimits = {
      ...sanitizeLlm(createdLlm),
      rateLimits,
    }

    broadcastSseChange({
      type: 'update',
      kind: 'llms',
      data: llmWithRateLimits,
    })

    response.status(201).json({
      llm: llmWithRateLimits,
    })
  }
  catch (error) {
    console.error('Failed to update llm', error)
    response.status(500).json({ error: 'Failed to update llm' })
  }
}
