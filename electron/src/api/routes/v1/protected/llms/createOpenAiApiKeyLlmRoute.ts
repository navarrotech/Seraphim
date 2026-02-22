// Copyright © 2026 Jalapeno Labs

import type { Prisma } from '@prisma/client'
import type { Request, Response } from 'express'
import type { OpenAiApiKeyLlmCreateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { openAiApiKeyLlmCreateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { SUPPORTED_MODELS_BY_LLM } from '@electron/constants'
import { requireDatabaseClient } from '@electron/database'
import { createLlmWithDefaults } from './createLlmHelpers'
import { sanitizeLlm } from './llmSanitizer'

export type RequestBody = OpenAiApiKeyLlmCreateRequest

export async function handleCreateOpenAiApiKeyLlmRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create OpenAI API key llm API')

  const body = parseRequestBody(
    openAiApiKeyLlmCreateSchema,
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
    const user = await databaseClient.user.findFirst({
      orderBy: { createdAt: 'asc' },
    })

    if (!user) {
      console.debug('OpenAI API key llm create requested, but no users exist')
      response.status(404).json({ error: 'User not found' })
      return
    }

    const supportedModels = SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY
    if (!supportedModels.includes(body.preferredModel as any)) {
      console.debug('OpenAI API key llm create rejected for unsupported model', {
        preferredModel: body.preferredModel,
      })
      response.status(400).json({
        error: 'Preferred model is not supported for OpenAI API key llms',
      })
      return
    }

    const llmData = {
      user: {
        connect: {
          id: user.id,
        },
      },
      type: 'OPENAI_API_KEY',
      name: body.name,
      preferredModel: body.preferredModel,
      apiKey: body.apiKey,
      tokenLimit: body.tokenLimit,
      isDefault: body.isDefault,
    } satisfies Prisma.LlmCreateInput

    const llm = await createLlmWithDefaults(databaseClient, {
      userId: user.id,
      data: llmData,
      isDefault: body.isDefault,
    })

    const sanitizedLlm = sanitizeLlm(llm)

    broadcastSseChange({
      type: 'create',
      kind: 'llms',
      data: sanitizedLlm,
    })

    response.status(201).json({ llm: sanitizedLlm })
  }
  catch (error) {
    console.error('Failed to create OpenAI API key llm', error)
    response.status(500).json({ error: 'Failed to create llm' })
  }
}
