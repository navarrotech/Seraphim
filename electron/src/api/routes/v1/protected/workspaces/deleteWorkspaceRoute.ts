// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { workspaceIdSchema } from '@electron/validators'
import { parseRequestParams } from '../../validation'

type RouteParams = {
  workspaceId: string
}

const workspaceParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
})

export async function handleDeleteWorkspaceRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Delete workspace API')

  const params = parseRequestParams(
    workspaceParamsSchema,
    request,
    response,
    {
      context: 'Delete workspace API',
      errorMessage: 'Workspace ID is required',
    },
  )
  if (!params) {
    return
  }

  const { workspaceId } = params

  try {
    const existingWorkspace = await databaseClient.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!existingWorkspace) {
      console.debug('Workspace delete failed, workspace not found', {
        workspaceId,
      })
      response.status(404).json({ error: 'Workspace not found' })
      return
    }

    await databaseClient.workspace.delete({
      where: { id: workspaceId },
    })

    response.status(200).json({ deleted: true, workspaceId })
  }
  catch (error) {
    console.error('Failed to delete workspace', error)
    response.status(500).json({ error: 'Failed to delete workspace' })
  }
}

