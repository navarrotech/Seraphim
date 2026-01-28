// Copyright © 2026 Jalapeno Labs

import type { Prisma } from '@prisma/client'
import type { Request, Response } from 'express'
import type { KimiApiKeyConnectionCreateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { kimiApiKeyConnectionCreateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { SUPPORTED_MODELS_BY_LLM } from '@electron/constants'
import { requireDatabaseClient } from '@electron/database'
import { createConnectionWithDefaults } from './createConnectionHelpers'
import { sanitizeConnection } from './connectionSanitizer'

export type RequestBody = KimiApiKeyConnectionCreateRequest

export async function handleCreateKimiApiKeyConnectionRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create Kimi API key connection API')

  const body = parseRequestBody(
    kimiApiKeyConnectionCreateSchema,
    request,
    response,
    {
      context: 'Create Kimi API key connection API',
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
      console.debug('Kimi API key connection create requested, but no users exist')
      response.status(404).json({ error: 'User not found' })
      return
    }

    const supportedModels = SUPPORTED_MODELS_BY_LLM.KIMI_API_KEY
    if (!supportedModels.includes(body.preferredModel)) {
      console.debug('Kimi API key connection create rejected for unsupported model', {
        preferredModel: body.preferredModel,
      })
      response.status(400).json({
        error: 'Preferred model is not supported for Kimi API key connections',
      })
      return
    }

    const connectionData = {
      user: {
        connect: {
          id: user.id,
        },
      },
      type: 'KIMI_API_KEY',
      name: body.name,
      preferredModel: body.preferredModel,
      apiKey: body.apiKey,
      tokenLimit: body.tokenLimit,
      isDefault: body.isDefault,
    } satisfies Prisma.ConnectionCreateInput

    const connection = await createConnectionWithDefaults(databaseClient, {
      userId: user.id,
      data: connectionData,
      isDefault: body.isDefault,
    })

    const sanitizedConnection = sanitizeConnection(connection)

    broadcastSseChange({
      type: 'create',
      kind: 'connections',
      data: [ sanitizedConnection ],
    })

    response.status(201).json({ connection: sanitizedConnection })
  }
  catch (error) {
    console.error('Failed to create Kimi API key connection', error)
    response.status(500).json({ error: 'Failed to create connection' })
  }
}
