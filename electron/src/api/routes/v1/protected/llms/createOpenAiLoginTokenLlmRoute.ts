// Copyright © 2026 Jalapeno Labs

import type { Prisma } from '@prisma/client'
import type { Request, Response } from 'express'
import type { OpenAiLoginTokenLlmCreateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { openAiLoginTokenLlmCreateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { createLlmWithDefaults } from './createLlmHelpers'
import { sanitizeLlm } from './llmSanitizer'

export type RequestBody = OpenAiLoginTokenLlmCreateRequest

export async function handleCreateOpenAiLoginTokenLlmRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create OpenAI login token llm API')

  const body = parseRequestBody(
    openAiLoginTokenLlmCreateSchema,
    request,
    response,
    {
      context: 'Create OpenAI login token llm API',
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
      console.debug('OpenAI login token llm create requested, but no users exist')
      response.status(404).json({ error: 'User not found' })
      return
    }

    const llmData = {
      user: {
        connect: {
          id: user.id,
        },
      },
      type: 'OPENAI_LOGIN_TOKEN',
      name: body.name,
      accessToken: body.accessToken,
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
      data: [ sanitizedLlm ],
    })

    response.status(201).json({ llm: sanitizedLlm })
  }
  catch (error) {
    console.error('Failed to create OpenAI login token llm', error)
    response.status(500).json({ error: 'Failed to create llm' })
  }
}
