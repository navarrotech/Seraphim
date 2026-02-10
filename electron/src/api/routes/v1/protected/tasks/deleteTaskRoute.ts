// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'

// Misc
import { getTaskManager } from '@electron/tasks/taskManager'

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

  try {
    const taskManager = getTaskManager()
    const result = await taskManager.deleteTask(params.taskId)

    if (result.status === 'error') {
      response.status(result.httpStatus).json({ error: result.error })
      return
    }

    response.status(200).json({ deleted: true, taskId: result.taskId })
  }
  catch (error) {
    console.error('Failed to delete task', error)
    response.status(500).json({ error: 'Failed to delete task' })
  }
}
