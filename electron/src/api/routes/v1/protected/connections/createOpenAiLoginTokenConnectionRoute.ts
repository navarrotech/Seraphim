// Copyright © 2026 Jalapeno Labs

import type { Prisma } from '@prisma/client'
import type { Request, Response } from 'express'
import type { OpenAiLoginTokenConnectionCreateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { openAiLoginTokenConnectionCreateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { createConnectionWithDefaults } from './createConnectionHelpers'
import { sanitizeConnection } from './connectionSanitizer'

export type RequestBody = OpenAiLoginTokenConnectionCreateRequest

export async function handleCreateOpenAiLoginTokenConnectionRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create OpenAI login token connection API')

  const body = parseRequestBody(
    openAiLoginTokenConnectionCreateSchema,
    request,
    response,
    {
      context: 'Create OpenAI login token connection API',
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
      console.debug('OpenAI login token connection create requested, but no users exist')
      response.status(404).json({ error: 'User not found' })
      return
    }

    console.log('TODO: OPENAI_LOGIN_TOKEN connection auth is not implemented yet')

    const connectionData = {
      user: {
        connect: {
          id: user.id,
        },
      },
      type: 'OPENAI_LOGIN_TOKEN',
      name: body.name,
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
    console.error('Failed to create OpenAI login token connection', error)
    response.status(500).json({ error: 'Failed to create connection' })
  }
}
