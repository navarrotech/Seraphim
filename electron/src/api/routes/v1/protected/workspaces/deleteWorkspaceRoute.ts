// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'
import { workspaceIdSchema } from '@electron/validators'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

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

    broadcastSseChange({
      type: 'delete',
      kind: 'workspaces',
      data: existingWorkspace,
    })

    response.status(200).json({ deleted: true, workspaceId })
  }
  catch (error) {
    console.error('Failed to delete workspace', error)
    response.status(500).json({ error: 'Failed to delete workspace' })
  }
}
