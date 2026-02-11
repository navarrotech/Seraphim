// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Misc
import { requireDatabaseClient } from '@electron/database'

export async function handleListTasksRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('List tasks API')

  try {
    const tasks = await databaseClient.task.findMany({
      where: { archived: false },
      orderBy: { createdAt: 'desc' },
    })
    response.status(200).json({ tasks })
  }
  catch (error) {
    console.error('Failed to list tasks', error)
    response.status(500).json({ error: 'Failed to list tasks' })
  }
}


