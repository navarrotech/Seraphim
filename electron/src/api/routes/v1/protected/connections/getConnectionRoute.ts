// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { sanitizeConnection } from './connectionSanitizer'

type RouteParams = {
  connectionId: string
}

const connectionParamsSchema = z.object({
  connectionId: z.string().trim().min(1),
})

export async function handleGetConnectionRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Get connection API')

  const routeParams = parseRequestParams(
    connectionParamsSchema,
    request,
    response,
    {
      context: 'Get connection API',
      errorMessage: 'Connection ID is required',
    },
  )
  if (!routeParams) {
    return
  }

  const { connectionId } = routeParams

  try {
    const connection = await databaseClient.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      console.debug('Connection get failed, connection not found', {
        connectionId,
      })
      response.status(404).json({ error: 'Connection not found' })
      return
    }

    response.status(200).json({
      connection: sanitizeConnection(connection),
    })
  }
  catch (error) {
    console.error('Failed to get connection', error)
    response.status(500).json({ error: 'Failed to get connection' })
  }
}
