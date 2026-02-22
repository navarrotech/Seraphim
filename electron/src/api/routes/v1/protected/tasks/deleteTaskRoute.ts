// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Core
import { requireDatabaseClient } from '@electron/database'
import { parseRequestParams } from '../../validation'
import { z } from 'zod'

// Schema
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
    const prisma = requireDatabaseClient('Delete task API')
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
    })

    if (!task) {
      response.status(404).json({ error: 'Task not found' })
      return
    }

    const taskManager = getTaskManager()

    response.status(200).json({ deleted: true, task })

    await taskManager.deleteTask(params.taskId)
  }
  catch (error) {
    console.error('Failed to delete task', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to delete task' })
    }
  }
}
