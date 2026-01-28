// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { UserSettingsUpdateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { userSettingsUpdateSchema } from '@common/schema'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'

export type RequestBody = UserSettingsUpdateRequest

export async function handleUpdateUserSettingsRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Update user settings API')

  const updateData = parseRequestBody(
    userSettingsUpdateSchema,
    request,
    response,
    {
      context: 'Update user settings API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!updateData) {
    return
  }

  try {
    const user = await databaseClient.user.findFirst({
      orderBy: { createdAt: 'asc' },
    })

    if (!user) {
      console.debug('User settings update requested, but no users exist')
      response.status(404).json({ error: 'User not found' })
      return
    }

    const settings = await databaseClient.userSettings.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        user: {
          connect: {
            id: user.id,
          },
        },
        ...updateData,
      },
    })

    broadcastSseChange({
      type: 'update',
      kind: 'settings',
      data: [ settings ],
    })

    response.status(200).json({ settings })
  }
  catch (error) {
    console.error('Failed to update user settings', error)
    response.status(500).json({ error: 'Failed to update user settings' })
  }
}
