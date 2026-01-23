// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { userIdSchema, workspaceIdSchema } from '@electron/validators'
import { parseRequestBody } from '../../validation'

export type RequestBody = {
  userId: string
  workspaceId: string
  name: string
  branch: string
  container: string
  archived?: boolean
}

const createTaskBodySchema = z.object({
  userId: userIdSchema,
  workspaceId: workspaceIdSchema,
  name: z.string().trim().min(1),
  branch: z.string().trim().min(1),
  container: z.string().trim().min(1),
  archived: z.boolean().optional().default(false),
}).strict()

export async function handleCreateTaskRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create task API')

  const body = parseRequestBody(
    createTaskBodySchema,
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
    response.status(201).json({ task })
  }
  catch (error) {
    console.error('Failed to create task', error)
    response.status(500).json({ error: 'Failed to create task' })
  }
}
