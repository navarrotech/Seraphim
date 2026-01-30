// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestParams } from '../../validation'

// Misc
import {
  formatSseEvent,
  initializeSseResponse,
} from '@electron/api/sse/sseManager'
import {
  taskLogManager,
  writeTaskLogSnapshot,
} from '@electron/api/sse/taskLogManager'
import { requireDatabaseClient } from '@electron/database'
import { getDockerClient } from '@electron/docker/docker'

type RouteParams = {
  taskId: string
}

const taskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
})

export async function handleStreamTaskLogsRequest(
  request: Request<RouteParams>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Stream task logs SSE')

  const params = parseRequestParams(
    taskParamsSchema,
    request,
    response,
    {
      context: 'Stream task logs SSE',
      errorMessage: 'Task ID is required',
    },
  )
  if (!params) {
    return
  }

  const { taskId } = params

  const task = await databaseClient.task.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    console.debug('Task log stream requested for missing task', { taskId })
    response.status(404).json({ error: 'Task not found' })
    return
  }

  if (!task.container || task.container === 'pending') {
    console.debug('Task log stream requested before container is ready', {
      taskId,
      containerId: task.container,
    })
    response.status(409).json({ error: 'Task container is not ready yet' })
    return
  }

  const dockerClient = getDockerClient()
  if (!dockerClient) {
    console.debug('Task log stream requested without docker client', {
      taskId,
      containerId: task.container,
    })
    response.status(503).json({ error: 'Docker client is not available' })
    return
  }

  initializeSseResponse(response)
  await writeTaskLogSnapshot(task.container, response)
  response.write(formatSseEvent('connected', 'ok'))

  taskLogManager.registerClient(taskId, task.container, response)

  function handleClose() {
    taskLogManager.removeClient(taskId, response)
    response.end()
  }

  request.on('close', handleClose)
}
