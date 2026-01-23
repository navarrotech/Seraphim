// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { parseRequestParams } from '../../validation'

type RouteParams = {
  taskId: string
}

const taskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
})

export async function handleDeleteTaskRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Delete task API')

  const params = parseRequestParams(
    taskParamsSchema,
    request,
    response,
    {
      context: 'Delete task API',
      errorMessage: 'Task ID is required',
    },
  )
  if (!params) {
    return
  }

  const { taskId } = params

  try {
    const existingTask = await databaseClient.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      console.debug('Task delete failed, task not found', {
        taskId,
      })
      response.status(404).json({ error: 'Task not found' })
      return
    }

    await databaseClient.task.delete({
      where: { id: taskId },
    })

    response.status(200).json({ deleted: true, taskId })
  }
  catch (error) {
    console.error('Failed to delete task', error)
    response.status(500).json({ error: 'Failed to delete task' })
  }
}

