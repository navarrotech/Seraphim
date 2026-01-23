// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { TaskCreateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { taskCreateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

export type RequestBody = TaskCreateRequest

export async function handleCreateTaskRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create task API')

  const body = parseRequestBody(
    taskCreateSchema,
    request,
    response,
    {
      context: 'Create task API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!body) {
    return
  }

  const {
    userId,
    workspaceId,
    name,
    branch,
    container,
    archived,
  } = body

  try {
    const task = await databaseClient.task.create({
      data: {
        userId,
        workspaceId,
        name,
        branch,
        container,
        archived,
      },
    })

    broadcastSseChange({
      type: 'create',
      kind: 'tasks',
      data: [ task ],
    })

    response.status(201).json({ task })
  }
  catch (error) {
    console.error('Failed to create task', error)
    response.status(500).json({ error: 'Failed to create task' })
  }
}
