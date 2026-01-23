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
}

const createWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
  containerImage: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  setupScript: z.string().trim().optional().default(''),
  postScript: z.string().trim().optional().default(''),
  cacheFiles: z.array(z.string().trim()).optional().default([]),
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
  } = body

  try {
    const workspace = await databaseClient.workspace.create({
      data: {
        name,
        repository,
        containerImage,
        description,
        setupScript,
        postScript,
        cacheFiles,
      },
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
