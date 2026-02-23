// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Misc
import { requireDatabaseClient } from '@electron/database'

export async function handleListWorkspacesRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('List workspaces API')

  try {
    const workspaces = await databaseClient.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      include: { envEntries: true },
    })
    response.status(200).json({ workspaces })
  }
  catch (error) {
    console.error('Failed to list workspaces', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to list workspaces' })
    }
  }
}
