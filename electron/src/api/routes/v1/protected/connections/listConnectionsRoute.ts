// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { sanitizeConnection } from './connectionSanitizer'

export async function handleListConnectionsRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('List connections API')

  try {
    const connections = await databaseClient.connection.findMany({
      orderBy: { createdAt: 'desc' },
    })

    response.status(200).json({
      connections: connections.map(sanitizeConnection),
    })
  }
  catch (error) {
    console.error('Failed to list connections', error)
    response.status(500).json({ error: 'Failed to list connections' })
  }
}
