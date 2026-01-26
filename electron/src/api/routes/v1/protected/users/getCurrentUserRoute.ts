// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Misc
import { requireDatabaseClient } from '@electron/database'

export async function handleGetCurrentUserRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Get current user API')

  try {
    const user = await databaseClient.user.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { settings: true },
    })

    if (!user) {
      console.debug('Current user requested, but no users exist')
      response.status(404).json({ error: 'User not found' })
      return
    }

    response.status(200).json({ user })
  }
  catch (error) {
    console.error('Failed to fetch current user', error)
    response.status(500).json({ error: 'Failed to fetch current user' })
  }
}
