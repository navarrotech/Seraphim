// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { WorkspaceUpdateRequest } from '@common/schema/workspace'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestBody, parseRequestParams } from '../../validation'
import { workspaceUpdateSchema } from '@common/schema/workspace'
import { workspaceIdSchema } from '@electron/validators'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

export type RequestBody = WorkspaceUpdateRequest

type RouteParams = {
  workspaceId: string
}

const workspaceParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
})

export async function handleUpdateWorkspaceRequest(
  request: Request<RouteParams, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Update workspace API')

  const params = parseRequestParams(
    workspaceParamsSchema,
    request,
    response,
    {
      context: 'Update workspace API',
      errorMessage: 'Workspace ID is required',
    },
  )
  if (!params) {
    return
  }

  const updateData = parseRequestBody(
    workspaceUpdateSchema,
    request,
    response,
    {
      context: 'Update workspace API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!updateData) {
    return
  }

  const { envEntries, ...workspaceUpdates } = updateData
  const { workspaceId } = params

  try {
    const existingWorkspace = await databaseClient.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!existingWorkspace) {
      console.debug('Workspace update failed, workspace not found', {
        workspaceId,
      })
      response.status(404).json({ error: 'Workspace not found' })
      return
    }

    const workspaceUpdateData: Record<string, unknown> = { ...workspaceUpdates }

    if (envEntries) {
      workspaceUpdateData.envEntries = {
        deleteMany: {},
      }
      if (envEntries.length > 0) {
        workspaceUpdateData.envEntries = {
          deleteMany: {},
          createMany: {
            data: envEntries,
          },
        }
      }
    }

    const workspace = await databaseClient.workspace.update({
      where: { id: workspaceId },
      data: workspaceUpdateData,
      include: { envEntries: true },
    })

    broadcastSseChange({
      type: 'update',
      kind: 'workspaces',
      data: workspace,
    })

    response.status(200).json({ workspace })
  }
  catch (error) {
    console.error('Failed to update workspace', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to update workspace' })
    }
  }
}
