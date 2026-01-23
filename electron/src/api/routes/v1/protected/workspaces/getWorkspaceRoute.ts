// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'
import { workspaceIdSchema } from '@electron/validators'

// Misc
import { requireDatabaseClient } from '@electron/database'

type RouteParams = {
  workspaceId: string
}

const workspaceParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
})

export async function handleGetWorkspaceRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Get workspace API')

  const params = parseRequestParams(
    workspaceParamsSchema,
    request,
    response,
    {
      context: 'Get workspace API',
      errorMessage: 'Workspace ID is required',
    },
  )
  if (!params) {
    return
  }

  const { workspaceId } = params

  try {
    const workspace = await databaseClient.workspace.findUnique({
      where: { id: workspaceId },
      include: { envEntries: true },
    })

    if (!workspace) {
      console.debug('Workspace not found', { workspaceId })
      response.status(404).json({ error: 'Workspace not found' })
      return
    }

    response.status(200).json({ workspace })
  }
  catch (error) {
    console.error('Failed to fetch workspace', error)
    response.status(500).json({ error: 'Failed to fetch workspace' })
  }
}
