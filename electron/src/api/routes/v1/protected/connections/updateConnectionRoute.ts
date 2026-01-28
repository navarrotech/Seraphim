// Copyright © 2026 Jalapeno Labs

import type { Connection, Prisma } from '@prisma/client'
import type { Request, Response } from 'express'
import type { ConnectionUpdateRequest } from '@common/schema'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestBody, parseRequestParams } from '../../validation'
import { connectionUpdateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { sanitizeConnection } from './connectionSanitizer'

type RouteParams = {
  connectionId: string
}

type DatabaseClient = ReturnType<typeof requireDatabaseClient>

export type RequestBody = ConnectionUpdateRequest

const apiKeyConnectionTypes = new Set<Connection['type']>([
  'OPENAI_API_KEY',
  'KIMI_API_KEY',
])

const connectionParamsSchema = z.object({
  connectionId: z.string().trim().min(1),
})

async function updateConnectionWithDefaults(
  databaseClient: DatabaseClient,
  connectionId: string,
  userId: string,
  updateData: RequestBody,
) {
  async function updateConnectionTransaction(
    transactionClient: Prisma.TransactionClient,
  ) {
    if (updateData.isDefault === true) {
      await transactionClient.connection.updateMany({
        where: {
          userId,
          id: { not: connectionId },
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    return transactionClient.connection.update({
      where: { id: connectionId },
      data: updateData,
    })
  }

  return databaseClient.$transaction(updateConnectionTransaction)
}

export async function handleUpdateConnectionRequest(
  request: Request<RouteParams, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Update connection API')

  const routeParams = parseRequestParams(
    connectionParamsSchema,
    request,
    response,
    {
      context: 'Update connection API',
      errorMessage: 'Connection ID is required',
    },
  )
  if (!routeParams) {
    return
  }

  const updateData = parseRequestBody(
    connectionUpdateSchema,
    request,
    response,
    {
      context: 'Update connection API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!updateData) {
    return
  }

  const { connectionId } = routeParams

  try {
    const existingConnection = await databaseClient.connection.findUnique({
      where: { id: connectionId },
    })

    if (!existingConnection) {
      console.debug('Connection update failed, connection not found', {
        connectionId,
      })
      response.status(404).json({ error: 'Connection not found' })
      return
    }

    if (
      updateData.apiKey
      && !apiKeyConnectionTypes.has(existingConnection.type)
    ) {
      console.debug('Connection update rejected for unsupported apiKey change', {
        connectionId,
        type: existingConnection.type,
      })
      response.status(400).json({
        error: 'API key updates are not supported for this connection type',
      })
      return
    }

    const connection = await updateConnectionWithDefaults(
      databaseClient,
      connectionId,
      existingConnection.userId,
      updateData,
    )

    const sanitizedConnection = sanitizeConnection(connection)

    broadcastSseChange({
      type: 'update',
      kind: 'connections',
      data: [ sanitizedConnection ],
    })

    response.status(200).json({ connection: sanitizedConnection })
  }
  catch (error) {
    console.error('Failed to update connection', error)
    response.status(500).json({ error: 'Failed to update connection' })
  }
}
