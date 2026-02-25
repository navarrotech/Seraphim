// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { Llm, LlmWithRateLimits } from '@common/types'
import type { UpsertLlmRequest } from '@common/schema/llm'

// Core
import { parseRequestBody, parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { getCallableLLM } from '@common/llms/call'

// Lib
import { z } from 'zod'

// Schema
import { upsertLlmSchema } from '@common/schema/llm'

// Utility
import { sanitizeLlm, setNewDefaultLlm } from './utils'

const upsertLlmParamsSchema = z.object({
  llmId: z.string().trim().min(1).optional(),
})

type UpsertLlmRouteParams = z.infer<typeof upsertLlmParamsSchema>
export async function handleUpsertLlmRequest(
  request: Request<
    UpsertLlmRouteParams,
    unknown,
    UpsertLlmRequest
  >,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    upsertLlmParamsSchema,
    request,
    response,
    {
      context: 'Upsert llm API',
      errorMessage: 'Llm ID is required',
    },
  )
  if (!params) {
    console.debug('Upsert llm request failed route param validation')
    return
  }

  const { llmId } = params

  const body = parseRequestBody(
    upsertLlmSchema,
    request,
    response,
    {
      context: llmId ? 'Update llm API' : 'Create OpenAI API key llm API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!body) {
    console.debug('Upsert llm request failed body validation')
    return
  }

  const prisma = requireDatabaseClient('Upsert llm API')

  try {
    if (!llmId) {
      const user = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
      })

      if (!user) {
        console.debug('OpenAI API key llm create requested, but no users exist')
        response.status(404).json({ error: 'User not found' })
        return
      }

      const callableLlm = getCallableLLM({
        name: body.name,
        apiKey: body.apiKey,
        preferredModel: body.preferredModel,
        type: body.type,
      } as Llm)

      const [ isValid, errorMessage ] = await callableLlm.validateLlm()

      if (!isValid) {
        console.debug('LLM validation failed during creation', {
          name: body.name,
          type: body.type,
          preferredModel: body.preferredModel,
          errorMessage,
        })
        response.status(400).json({
          error: `LLM validation failed: ${errorMessage}`,
        })
        return
      }

      const [ createdLlm, rateLimits ] = await Promise.all([
        prisma.llm.create({
          data: {
            user: {
              connect: {
                id: user.id,
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
        await setNewDefaultLlm(user.id, createdLlm.id)
      }

      const llmWithRateLimits: LlmWithRateLimits = {
        ...sanitizeLlm(createdLlm),
        rateLimits,
      }

      broadcastSseChange({
        type: 'create',
        kind: 'llms',
        data: llmWithRateLimits,
      })

      response.status(201).json({
        llm: llmWithRateLimits,
      })
      return
    }

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
    console.error('Failed to upsert llm', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to upsert llm' })
    }
  }
}
