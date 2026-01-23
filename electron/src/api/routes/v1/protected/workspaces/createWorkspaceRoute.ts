// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { WorkspaceCreateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { workspaceCreateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

export type RequestBody = WorkspaceCreateRequest

export async function handleCreateWorkspaceRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create workspace API')

  const body = parseRequestBody(
    workspaceCreateSchema,
    request,
    response,
    {
      context: 'Create workspace API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!body) {
    return
  }

  const {
    name,
    repository,
    containerImage,
    description,
    setupScript,
    postScript,
    cacheFiles,
    envEntries,
  } = body

  try {
    const baseWorkspaceData = {
      name,
      repository,
      containerImage,
      description,
      setupScript,
      postScript,
      cacheFiles,
    }

    let workspaceData = baseWorkspaceData
    if (envEntries.length > 0) {
      workspaceData = {
        ...baseWorkspaceData,
        envEntries: {
          createMany: {
            data: envEntries,
          },
        },
      }
    }

    const workspace = await databaseClient.workspace.create({
      data: workspaceData,
      include: { envEntries: true },
    })

    broadcastSseChange({
      type: 'create',
      kind: 'workspaces',
      data: [ workspace ],
    })

    response.status(201).json({ workspace })
  }
  catch (error) {
    console.error('Failed to create workspace', error)
    response.status(500).json({ error: 'Failed to create workspace' })
  }
}
