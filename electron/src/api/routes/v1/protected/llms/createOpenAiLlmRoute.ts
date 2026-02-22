// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { Llm, LlmWithRateLimits } from '@common/types'
import type { CreateLlmRequest } from '@common/schema/llm'

// Core
import { requireDatabaseClient } from '@electron/database'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { parseRequestBody } from '../../validation'

// Schema
import { createLlmSchema } from '@common/schema/llm'
import { sanitizeLlm, setNewDefaultLlm } from './utils'
import { getCallableLLM } from '@common/llms/call'


export async function handleCreateLlmRequest(
  request: Request<Record<string, never>, unknown, CreateLlmRequest>,
  response: Response,
): Promise<void> {
  const prisma = requireDatabaseClient('Create OpenAI API key llm API')

  const body = parseRequestBody(
    createLlmSchema,
    request,
    response,
    {
      context: 'Create OpenAI API key llm API',
      errorMessage: 'Invalid request body',
    },
  )

  if (!body) {
    return
  }

  try {
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
  }
  catch (error) {
    console.error('Failed to create OpenAI API key llm', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to create llm' })
    }
  }
}
