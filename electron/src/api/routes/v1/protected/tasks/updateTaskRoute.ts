// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { parseRequestBody, parseRequestParams } from '../../validation'

export type RequestBody = {
  name?: string
  branch?: string
  container?: string
  archived?: boolean
}

type RouteParams = {
  taskId: string
}

const taskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
})

const updateTaskBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  branch: z.string().trim().min(1).optional(),
  container: z.string().trim().min(1).optional(),
  archived: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
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
    updateTaskBodySchema,
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
    response.status(200).json({ task })
  }
  catch (error) {
    console.error('Failed to update task', error)
    response.status(500).json({ error: 'Failed to update task' })
  }
}

