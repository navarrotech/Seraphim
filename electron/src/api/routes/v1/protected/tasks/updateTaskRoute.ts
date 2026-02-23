// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { TaskUpdateRequest } from '@common/schema/task'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestBody, parseRequestParams } from '../../validation'
import { taskUpdateSchema } from '@common/schema/task'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

export type RequestBody = TaskUpdateRequest

type RouteParams = {
  taskId: string
}

const taskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
})

export async function handleUpdateTaskRequest(
  request: Request<RouteParams, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Update task API')

  const params = parseRequestParams(
    taskParamsSchema,
    request,
    response,
    {
      context: 'Update task API',
      errorMessage: 'Task ID is required',
    },
  )
  if (!params) {
    return
  }

  const updateData = parseRequestBody(
    taskUpdateSchema,
    request,
    response,
    {
      context: 'Update task API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!updateData) {
    return
  }

  const { taskId } = params

  try {
    const existingTask = await databaseClient.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      console.debug('Task update failed, task not found', {
        taskId,
      })
      response.status(404).json({ error: 'Task not found' })
      return
    }

    const task = await databaseClient.task.update({
      where: { id: taskId },
      data: updateData,
    })

    broadcastSseChange({
      type: 'update',
      kind: 'tasks',
      data: task,
    })

    response.status(200).json({ task })
  }
  catch (error) {
    console.error('Failed to update task', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to update task' })
    }
  }
}
