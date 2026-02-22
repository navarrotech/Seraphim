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

export async function handleGetTaskUsageRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    taskParamsSchema,
    request,
    response,
    {
      context: 'Get task API',
      errorMessage: 'Task ID is required',
    },
  )
  if (!params) {
    return
  }

  const { taskId } = params

  try {
    const taskManager = getTaskManager()

    const task = taskManager.getTask(taskId)
    if (!task) {
      console.debug('Task not found', { taskId })
      response.status(404).json({ error: 'Task not found' })
      return
    }

    const usage = task.usageData

    response.status(200).json(usage)
  }
  catch (error) {
    console.error('Failed to fetch task', error)
    response.status(500).json({ error: 'Failed to fetch task' })
  }
}
