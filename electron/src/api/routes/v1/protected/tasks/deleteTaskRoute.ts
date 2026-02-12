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

    response.status(200).json({ deleted: true })

    await taskManager.deleteTask(params.taskId)
  }
  catch (error) {
    console.error('Failed to delete task', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to delete task' })
    }
  }
}
