// Copyright © 2026 Jalapeno Labs

import type { PrismaClient } from '@prisma/client'
import type { Request, Response, Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { getDatabaseClient } from '../../../database'

type WorkspaceIdParams = {
  workspaceId: string
}

type WorkspaceCreateBody = {
  name: string
  repository: string
  containerImage: string
  description?: string
  setupScript?: string
  env?: string[]
  secrets?: string[]
}

type WorkspaceUpdateBody = {
  name?: string
  repository?: string
  containerImage?: string
  description?: string
  setupScript?: string
  env?: string[]
  secrets?: string[]
}

type WorkspaceUpdateData = {
  name?: string
  repository?: string
  containerImage?: string
  description?: string
  setupScript?: string
  env?: string[]
  secrets?: string[]
}

function getDatabaseClientOrLog(response: Response): PrismaClient | null {
  const databaseClient = getDatabaseClient()
  if (!databaseClient) {
    console.debug('Workspace API requested without database client')
    response.status(500).json({ error: 'Database unavailable' })
    return null
  }

  return databaseClient
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every((item) => typeof item === 'string')
}

function getWorkspaceId(
  request: Request<WorkspaceIdParams>,
  response: Response,
): string | null {
  const workspaceId = request.params.workspaceId
  if (!workspaceId) {
    console.debug('Workspace ID missing from request params', {
      params: request.params,
    })
    response.status(400).json({ error: 'Workspace ID is required' })
    return null
  }

  return workspaceId
}

function parseWorkspaceCreateBody(
  request: Request<unknown, unknown, WorkspaceCreateBody>,
  response: Response,
): WorkspaceCreateBody | null {
  if (!isRecord(request.body)) {
    console.debug('Workspace create request body is missing or invalid', {
      body: request.body,
    })
    response.status(400).json({ error: 'Request body must be a JSON object' })
    return null
  }

  const name = request.body.name
  if (typeof name !== 'string' || !name.trim()) {
    console.debug('Workspace create missing valid name', { name })
    response.status(400).json({ error: 'Workspace name is required' })
    return null
  }

  const repository = request.body.repository
  if (typeof repository !== 'string' || !repository.trim()) {
    console.debug('Workspace create missing valid repository', { repository })
    response.status(400).json({ error: 'Workspace repository is required' })
    return null
  }

  const containerImage = request.body.containerImage
  if (typeof containerImage !== 'string' || !containerImage.trim()) {
    console.debug('Workspace create missing valid containerImage', {
      containerImage,
    })
    response.status(400).json({ error: 'Workspace containerImage is required' })
    return null
  }

  let description = ''
  if ('description' in request.body) {
    if (typeof request.body.description !== 'string') {
      console.debug('Workspace create invalid description', {
        description: request.body.description,
      })
      response.status(400).json({ error: 'Workspace description must be a string' })
      return null
    }
    description = request.body.description
  }

  let setupScript = ''
  if ('setupScript' in request.body) {
    if (typeof request.body.setupScript !== 'string') {
      console.debug('Workspace create invalid setupScript', {
        setupScript: request.body.setupScript,
      })
      response.status(400).json({ error: 'Workspace setupScript must be a string' })
      return null
    }
    setupScript = request.body.setupScript
  }

  let env: string[] = []
  if ('env' in request.body) {
    if (!isStringArray(request.body.env)) {
      console.debug('Workspace create invalid env array', {
        env: request.body.env,
      })
      response.status(400).json({ error: 'Workspace env must be an array of strings' })
      return null
    }
    env = request.body.env
  }

  let secrets: string[] = []
  if ('secrets' in request.body) {
    if (!isStringArray(request.body.secrets)) {
      console.debug('Workspace create invalid secrets array', {
        secrets: request.body.secrets,
      })
      response.status(400).json({ error: 'Workspace secrets must be an array of strings' })
      return null
    }
    secrets = request.body.secrets
  }

  return {
    name,
    repository,
    containerImage,
    description,
    setupScript,
    env,
    secrets,
  }
}

function parseWorkspaceUpdateBody(
  request: Request<unknown, unknown, WorkspaceUpdateBody>,
  response: Response,
): WorkspaceUpdateData | null {
  if (!isRecord(request.body)) {
    console.debug('Workspace update request body is missing or invalid', {
      body: request.body,
    })
    response.status(400).json({ error: 'Request body must be a JSON object' })
    return null
  }

  const updateData: WorkspaceUpdateData = {}

  if ('name' in request.body) {
    if (typeof request.body.name !== 'string' || !request.body.name.trim()) {
      console.debug('Workspace update invalid name', { name: request.body.name })
      response.status(400).json({ error: 'Workspace name must be a non-empty string' })
      return null
    }
    updateData.name = request.body.name
  }

  if ('repository' in request.body) {
    if (typeof request.body.repository !== 'string'
      || !request.body.repository.trim()
    ) {
      console.debug('Workspace update invalid repository', {
        repository: request.body.repository,
      })
      response.status(400).json({ error: 'Workspace repository must be a non-empty string' })
      return null
    }
    updateData.repository = request.body.repository
  }

  if ('containerImage' in request.body) {
    if (typeof request.body.containerImage !== 'string'
      || !request.body.containerImage.trim()
    ) {
      console.debug('Workspace update invalid containerImage', {
        containerImage: request.body.containerImage,
      })
      response.status(400).json({ error: 'Workspace containerImage must be a non-empty string' })
      return null
    }
    updateData.containerImage = request.body.containerImage
  }

  if ('description' in request.body) {
    if (typeof request.body.description !== 'string') {
      console.debug('Workspace update invalid description', {
        description: request.body.description,
      })
      response.status(400).json({ error: 'Workspace description must be a string' })
      return null
    }
    updateData.description = request.body.description
  }

  if ('setupScript' in request.body) {
    if (typeof request.body.setupScript !== 'string') {
      console.debug('Workspace update invalid setupScript', {
        setupScript: request.body.setupScript,
      })
      response.status(400).json({ error: 'Workspace setupScript must be a string' })
      return null
    }
    updateData.setupScript = request.body.setupScript
  }

  if ('env' in request.body) {
    if (!isStringArray(request.body.env)) {
      console.debug('Workspace update invalid env array', {
        env: request.body.env,
      })
      response.status(400).json({ error: 'Workspace env must be an array of strings' })
      return null
    }
    updateData.env = request.body.env
  }

  if ('secrets' in request.body) {
    if (!isStringArray(request.body.secrets)) {
      console.debug('Workspace update invalid secrets array', {
        secrets: request.body.secrets,
      })
      response.status(400).json({ error: 'Workspace secrets must be an array of strings' })
      return null
    }
    updateData.secrets = request.body.secrets
  }

  if (Object.keys(updateData).length === 0) {
    console.debug('Workspace update request has no valid fields', {
      body: request.body,
    })
    response.status(400).json({ error: 'No valid fields provided for update' })
    return null
  }

  return updateData
}

export function createWorkspacesRouter(): Router {
  const workspacesRouter = createRouter()

  workspacesRouter.get('/', handleListWorkspacesRequest)
  workspacesRouter.get('/:workspaceId', handleGetWorkspaceRequest)
  workspacesRouter.post('/', handleCreateWorkspaceRequest)
  workspacesRouter.patch('/:workspaceId', handleUpdateWorkspaceRequest)
  workspacesRouter.delete('/:workspaceId', handleDeleteWorkspaceRequest)

  return workspacesRouter
}

export async function handleListWorkspacesRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  try {
    const workspaces = await databaseClient.workspace.findMany({
      orderBy: { createdAt: 'desc' },
    })
    response.status(200).json({ workspaces })
  }
  catch (error) {
    console.error('Failed to list workspaces', error)
    response.status(500).json({ error: 'Failed to list workspaces' })
  }
}

export async function handleGetWorkspaceRequest(
  request: Request<WorkspaceIdParams>,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  const workspaceId = getWorkspaceId(request, response)
  if (!workspaceId) {
    return
  }

  try {
    const workspace = await databaseClient.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!workspace) {
      console.debug('Workspace not found', { workspaceId })
      response.status(404).json({ error: 'Workspace not found' })
      return
    }

    response.status(200).json({ workspace })
  }
  catch (error) {
    console.error('Failed to fetch workspace', error)
    response.status(500).json({ error: 'Failed to fetch workspace' })
  }
}

export async function handleCreateWorkspaceRequest(
  request: Request<unknown, unknown, WorkspaceCreateBody>,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  const workspaceBody = parseWorkspaceCreateBody(request, response)
  if (!workspaceBody) {
    return
  }

  try {
    const workspace = await databaseClient.workspace.create({
      data: workspaceBody,
    })
    response.status(201).json({ workspace })
  }
  catch (error) {
    console.error('Failed to create workspace', error)
    response.status(500).json({ error: 'Failed to create workspace' })
  }
}

export async function handleUpdateWorkspaceRequest(
  request: Request<WorkspaceIdParams, unknown, WorkspaceUpdateBody>,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  const workspaceId = getWorkspaceId(request, response)
  if (!workspaceId) {
    return
  }

  const updateData = parseWorkspaceUpdateBody(request, response)
  if (!updateData) {
    return
  }

  try {
    const existingWorkspace = await databaseClient.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!existingWorkspace) {
      console.debug('Workspace update failed, workspace not found', {
        workspaceId,
      })
      response.status(404).json({ error: 'Workspace not found' })
      return
    }

    const workspace = await databaseClient.workspace.update({
      where: { id: workspaceId },
      data: updateData,
    })
    response.status(200).json({ workspace })
  }
  catch (error) {
    console.error('Failed to update workspace', error)
    response.status(500).json({ error: 'Failed to update workspace' })
  }
}

export async function handleDeleteWorkspaceRequest(
  request: Request<WorkspaceIdParams>,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  const workspaceId = getWorkspaceId(request, response)
  if (!workspaceId) {
    return
  }

  try {
    const existingWorkspace = await databaseClient.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!existingWorkspace) {
      console.debug('Workspace delete failed, workspace not found', {
        workspaceId,
      })
      response.status(404).json({ error: 'Workspace not found' })
      return
    }

    await databaseClient.workspace.delete({
      where: { id: workspaceId },
    })

    response.status(200).json({ deleted: true, workspaceId })
  }
  catch (error) {
    console.error('Failed to delete workspace', error)
    response.status(500).json({ error: 'Failed to delete workspace' })
  }
}
