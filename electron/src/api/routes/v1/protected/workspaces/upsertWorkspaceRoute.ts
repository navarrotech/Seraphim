// Copyright © 2026 Jalapeno Labs

import type { Prisma } from '@prisma/client'
import type { Request, Response } from 'express'
import type { UpsertWorkspaceRequest } from '@common/schema/workspace'

// Core
import { parseRequestBody, parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { workspaceIdSchema } from '@electron/validators'

// Lib
import { z } from 'zod'

// Schema
import { upsertWorkspaceSchema } from '@common/schema/workspace'

const upsertWorkspaceParamsSchema = z.object({
  workspaceId: workspaceIdSchema.optional(),
})

type UpsertWorkspaceRouteParams = z.infer<
  typeof upsertWorkspaceParamsSchema
>

export async function handleUpsertWorkspaceRequest(
  request: Request<
    UpsertWorkspaceRouteParams,
    unknown,
    UpsertWorkspaceRequest
  >,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    upsertWorkspaceParamsSchema,
    request,
    response,
    {
      context: 'Upsert workspace API',
      errorMessage: 'Workspace ID is required',
    },
  )
  if (!params) {
    console.debug('Upsert workspace request failed route param validation')
    return
  }

  const { workspaceId } = params

  const body = parseRequestBody(
    upsertWorkspaceSchema,
    request,
    response,
    {
      context: workspaceId ? 'Update workspace API' : 'Create workspace API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!body) {
    console.debug('Upsert workspace request failed body validation')
    return
  }

  const prisma = requireDatabaseClient('Upsert workspace API')

  let existingWorkspace = null
  if (workspaceId) {
    existingWorkspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { envEntries: true },
    })

    if (!existingWorkspace) {
      console.debug('Workspace update failed, workspace not found', {
        workspaceId,
      })
      response.status(404).json({ error: 'Workspace not found' })
      return
    }
  }

  const createEnvEntries = body.envEntries ?? []
  const createEnvEntryData: Prisma.WorkspaceEnvCreateManyWorkspaceInput[] = []
  for (const entry of createEnvEntries) {
    if (!entry.key || !entry.value) {
      console.debug('Workspace env entry missing key or value', { entry })
      continue
    }

    createEnvEntryData.push({
      key: entry.key,
      value: entry.value,
    })
  }

  const createWorkspaceData: Prisma.WorkspaceCreateInput = {
    name: body.name ?? '',
    sourceRepoUrl: body.sourceRepoUrl ?? '',
    gitBranchTemplate: body.gitBranchTemplate ?? '',
    customDockerfileCommands: body.customDockerfileCommands ?? '',
    description: body.description ?? '',
    setupScript: body.setupScript ?? '',
    postScript: body.postScript ?? '',
    cacheFiles: body.cacheFiles ?? [],
  }

  const createData: Prisma.WorkspaceCreateInput = createEnvEntryData.length
    ? {
        ...createWorkspaceData,
        envEntries: {
          createMany: {
            data: createEnvEntryData,
          },
        },
      }
    : createWorkspaceData

  const { envEntries, ...workspaceUpdates } = body
  const updateData: Record<string, unknown> = { ...workspaceUpdates }

  if (envEntries) {
    const updateEnvEntryData: Prisma.WorkspaceEnvCreateManyWorkspaceInput[] = []
    for (const entry of envEntries) {
      if (!entry.key || !entry.value) {
        console.debug('Workspace env entry missing key or value', { entry })
        continue
      }

      updateEnvEntryData.push({
        key: entry.key,
        value: entry.value,
      })
    }

    updateData.envEntries = {
      deleteMany: {},
    }

    if (updateEnvEntryData.length > 0) {
      updateData.envEntries = {
        deleteMany: {},
        createMany: {
          data: updateEnvEntryData,
        },
      }
    }
  }

  try {
    const workspace = await prisma.workspace.upsert({
      where: { id: workspaceId ?? 'draft' },
      create: createData,
      update: updateData,
      include: { envEntries: true },
    })

    if (existingWorkspace) {
      broadcastSseChange({
        type: 'update',
        kind: 'workspaces',
        data: workspace,
      })
      response.status(200).json({ workspace })
      return
    }

    broadcastSseChange({
      type: 'create',
      kind: 'workspaces',
      data: workspace,
    })
    response.status(201).json({ workspace })
  }
  catch (error) {
    console.error('Failed to upsert workspace', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to upsert workspace' })
    }
  }
}
