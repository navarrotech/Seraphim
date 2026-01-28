// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { sanitizeConnection } from './connectionSanitizer'

type RouteParams = {
  connectionId: string
}

const connectionParamsSchema = z.object({
  connectionId: z.string().trim().min(1),
})

export async function handleDeleteConnectionRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Delete connection API')

  const routeParams = parseRequestParams(
    connectionParamsSchema,
    request,
    response,
    {
      context: 'Delete connection API',
      errorMessage: 'Connection ID is required',
    },
  )
  if (!routeParams) {
    return
  }

  const { connectionId } = routeParams

  try {
    const existingConnection = await databaseClient.connection.findUnique({
      where: { id: connectionId },
    })

    if (!existingConnection) {
      console.debug('Connection delete failed, connection not found', {
        connectionId,
      })
      response.status(404).json({ error: 'Connection not found' })
      return
    }

    await databaseClient.connection.delete({
      where: { id: connectionId },
    })

    broadcastSseChange({
      type: 'delete',
      kind: 'connections',
      data: [ sanitizeConnection(existingConnection) ],
    })

    response.status(200).json({ deleted: true, connectionId })
  }
  catch (error) {
    console.error('Failed to delete connection', error)
    response.status(500).json({ error: 'Failed to delete connection' })
  }
}
