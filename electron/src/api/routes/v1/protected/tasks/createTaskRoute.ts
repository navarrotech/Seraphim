// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { TaskCreateRequest } from '@common/schema/task'

// Utility
import { parseRequestBody } from '../../validation'
import { taskCreateSchema } from '@common/schema/task'

// Misc
import { getTaskManager } from '@electron/tasks/taskManager'

export type RequestBody = TaskCreateRequest

export async function handleCreateTaskRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
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

  try {
    const taskManager = getTaskManager()
    const result = await taskManager.createTask(body)

    if (result.status === 'error') {
      response.status(result.httpStatus).json({ error: result.error })
      return
    }

    response.status(201).json({ task: result.task })
    await taskManager.launchTask(result.task.id, body.message)
  }
  catch (error) {
    console.error('Failed to create task', error)
    response.status(500).json({ error: 'Failed to create task' })
  }
}
