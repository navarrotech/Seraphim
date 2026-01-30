// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { TaskCreateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { taskCreateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { launchTask } from '@electron/jobs/launchTask'
import { requestTaskName, toContainerName } from '@electron/jobs/taskNaming'
import { teardownTask } from '@electron/jobs/teardownTask'

export type RequestBody = TaskCreateRequest

export async function handleCreateTaskRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create task API')

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

  const {
    userId,
    workspaceId,
    connectionId,
    message,
    branch,
    archived,
  } = body

  try {
    const workspace = await databaseClient.workspace.findUnique({
      where: { id: workspaceId },
      include: { envEntries: true },
    })

    if (!workspace) {
      console.debug('Task creation failed, workspace not found', {
        workspaceId,
      })
      response.status(404).json({ error: 'Workspace not found' })
      return
    }

    const repository = workspace.repository?.trim()
    if (!repository) {
      console.debug('Task creation failed, workspace missing repository', {
        workspaceId,
      })
      response.status(400).json({ error: 'Workspace repository is required' })
      return
    }

    const connection = await databaseClient.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      console.debug('Task creation failed, connection not found', {
        connectionId,
      })
      response.status(404).json({ error: 'Connection not found' })
      return
    }

    const codexTaskName = await requestTaskName(connection, {
      message,
      workspaceName: workspace.name,
    })
    if (!codexTaskName) {
      response.status(400).json({
        error: 'Codex authentication is not configured correctly',
      })
      return
    }

    const resolvedContainerName = toContainerName(codexTaskName)

    const authAccounts = await databaseClient.authAccount.findMany({
      where: {
        provider: 'GITHUB',
      },
    })

    const githubTokens = authAccounts
      .map((account) => account.accessToken)
      .filter((token): token is string => Boolean(token?.trim()))

    let containerId: string | null = null
    let containerName: string | null = resolvedContainerName
    let createdTaskId: string | null = null

    try {
      const pendingContainerId = 'pending'
      const createdTask = await databaseClient.task.create({
        data: {
          userId,
          workspaceId,
          connectionId,
          name: codexTaskName,
          branch,
          container: pendingContainerId,
          containerName,
          archived,
        },
      })

      createdTaskId = createdTask.id

      broadcastSseChange({
        type: 'create',
        kind: 'tasks',
        data: [ createdTask ],
      })

      response.status(201).json({ task: createdTask })

      const containerResult = await launchTask(
        workspace,
        repository,
        githubTokens,
        createdTask.id,
        containerName,
      )
      containerId = containerResult.containerId
      containerName = containerResult.containerName

      const task = await databaseClient.task.update({
        where: { id: createdTask.id },
        data: {
          container: containerId,
          containerName,
        },
      })

      broadcastSseChange({
        type: 'update',
        kind: 'tasks',
        data: [ task ],
      })
    }
    catch (error) {
      if (containerId) {
        await teardownTask(containerId)
      }

      if (createdTaskId) {
        console.debug('Preserving failed task record after launch failure', {
          taskId: createdTaskId,
        })
      }

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to provision task container'

      console.error('Failed to provision task container', error)

      if (response.headersSent) {
        return
      }

      if (errorMessage === 'Unable to authenticate repository clone') {
        response.status(403).json({
          error: 'Unable to clone repository for build',
        })
        return
      }

      if (errorMessage === 'Docker client is not available') {
        response.status(503).json({ error: 'Docker client is not available' })
        return
      }

      response.status(500).json({ error: 'Failed to provision task container' })
    }
  }
  catch (error) {
    console.error('Failed to create task', error)
    response.status(500).json({ error: 'Failed to create task' })
  }
}
