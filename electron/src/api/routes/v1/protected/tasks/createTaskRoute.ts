// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { TaskCreateRequest } from '@common/schema'

// Utility
import { parseRequestBody } from '../../validation'
import { taskCreateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { createTaskContainerForWorkspace, removeTaskContainer } from '@electron/docker/taskContainer'
import { resourcesDir } from '@electron/lib/internalFiles'

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
    name,
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

    const authAccounts = await databaseClient.authAccount.findMany({
      where: {
        provider: 'GITHUB',
      },
    })

    const githubTokens = authAccounts
      .map((account) => account.accessToken)
      .filter((token) => Boolean(token)) as string[]

    let containerId: string | null = null

    try {
      const containerResult = await createTaskContainerForWorkspace(
        workspace,
        repository,
        githubTokens,
        resourcesDir,
        workspace.envEntries,
      )
      containerId = containerResult.containerId

      const task = await databaseClient.task.create({
        data: {
          userId,
          workspaceId,
          connectionId,
          name,
          branch,
          container: containerId,
          archived,
        },
      })

      broadcastSseChange({
        type: 'create',
        kind: 'tasks',
        data: [ task ],
      })

      response.status(201).json({ task })
    }
    catch (error) {
      if (containerId) {
        await removeTaskContainer(containerId)
      }

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to provision task container'

      console.error('Failed to provision task container', error)

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
