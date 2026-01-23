// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestBody } from '../../validation'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

export type RequestBody = {
  name: string
  repository: string
  containerImage: string
  description?: string
  setupScript?: string
  postScript?: string
  cacheFiles?: string[]
  envEntries?: Array<{ key: string; value: string }>
}

const envEntrySchema = z.object({
  key: z.string().trim().min(1).max(256),
  value: z.string().trim().min(1).max(2048),
})

const createWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
  containerImage: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  setupScript: z.string().trim().optional().default(''),
  postScript: z.string().trim().optional().default(''),
  cacheFiles: z.array(z.string().trim()).optional().default([]),
  envEntries: z.array(envEntrySchema).optional().default([]),
}).strict()

export async function handleCreateWorkspaceRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Create workspace API')

  const body = parseRequestBody(
    createWorkspaceBodySchema,
    request,
    response,
    {
      context: 'Create workspace API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!body) {
    return
  }

  const {
    name,
    repository,
    containerImage,
    description,
    setupScript,
    postScript,
    cacheFiles,
    envEntries,
  } = body

  try {
    const baseWorkspaceData = {
      name,
      repository,
      containerImage,
      description,
      setupScript,
      postScript,
      cacheFiles,
    }

    let workspaceData = baseWorkspaceData
    if (envEntries.length > 0) {
      workspaceData = {
        ...baseWorkspaceData,
        envEntries: {
          createMany: {
            data: envEntries,
          },
        },
      }
    }

    const workspace = await databaseClient.workspace.create({
      data: workspaceData,
      include: { envEntries: true },
    })

    broadcastSseChange({
      type: 'create',
      kind: 'workspaces',
      data: [ workspace ],
    })

    response.status(201).json({ workspace })
  }
  catch (error) {
    console.error('Failed to create workspace', error)
    response.status(500).json({ error: 'Failed to create workspace' })
  }
}
