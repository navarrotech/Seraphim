// Copyright © 2026 Jalapeno Labs

import type { PrismaClient } from '@prisma/client'
import type { Request, Response, Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { getDatabaseClient } from '../../../database'

type TaskIdParams = {
  taskId: string
}

type TaskCreateBody = {
  userId: string
  workspaceId: string
  name: string
  branch: string
  container: string
  archived?: boolean
}

type TaskUpdateBody = {
  name?: string
  branch?: string
  container?: string
  archived?: boolean
}

type TaskUpdateData = {
  name?: string
  branch?: string
  container?: string
  archived?: boolean
}

function getDatabaseClientOrLog(response: Response): PrismaClient | null {
  const databaseClient = getDatabaseClient()
  if (!databaseClient) {
    console.debug('Task API requested without database client')
    response.status(500).json({ error: 'Database unavailable' })
    return null
  }

  return databaseClient
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getTaskId(
  request: Request<TaskIdParams>,
  response: Response,
): string | null {
  const taskId = request.params.taskId
  if (!taskId) {
    console.debug('Task ID missing from request params', {
      params: request.params,
    })
    response.status(400).json({ error: 'Task ID is required' })
    return null
  }

  return taskId
}

function parseTaskCreateBody(
  request: Request<unknown, unknown, TaskCreateBody>,
  response: Response,
): TaskCreateBody | null {
  if (!isRecord(request.body)) {
    console.debug('Task create request body is missing or invalid', {
      body: request.body,
    })
    response.status(400).json({ error: 'Request body must be a JSON object' })
    return null
  }

  const userId = request.body.userId
  if (typeof userId !== 'string' || !userId.trim()) {
    console.debug('Task create missing valid userId', { userId })
    response.status(400).json({ error: 'Task userId is required' })
    return null
  }

  const workspaceId = request.body.workspaceId
  if (typeof workspaceId !== 'string' || !workspaceId.trim()) {
    console.debug('Task create missing valid workspaceId', {
      workspaceId,
    })
    response.status(400).json({ error: 'Task workspaceId is required' })
    return null
  }

  const name = request.body.name
  if (typeof name !== 'string' || !name.trim()) {
    console.debug('Task create missing valid name', { name })
    response.status(400).json({ error: 'Task name is required' })
    return null
  }

  const branch = request.body.branch
  if (typeof branch !== 'string' || !branch.trim()) {
    console.debug('Task create missing valid branch', { branch })
    response.status(400).json({ error: 'Task branch is required' })
    return null
  }

  const container = request.body.container
  if (typeof container !== 'string' || !container.trim()) {
    console.debug('Task create missing valid container', { container })
    response.status(400).json({ error: 'Task container is required' })
    return null
  }

  let archived = false
  if ('archived' in request.body) {
    if (typeof request.body.archived !== 'boolean') {
      console.debug('Task create invalid archived flag', {
        archived: request.body.archived,
      })
      response.status(400).json({ error: 'Task archived must be a boolean' })
      return null
    }
    archived = request.body.archived
  }

  return {
    userId,
    workspaceId,
    name,
    branch,
    container,
    archived,
  }
}

function parseTaskUpdateBody(
  request: Request<unknown, unknown, TaskUpdateBody>,
  response: Response,
): TaskUpdateData | null {
  if (!isRecord(request.body)) {
    console.debug('Task update request body is missing or invalid', {
      body: request.body,
    })
    response.status(400).json({ error: 'Request body must be a JSON object' })
    return null
  }

  const updateData: TaskUpdateData = {}

  if ('name' in request.body) {
    if (typeof request.body.name !== 'string' || !request.body.name.trim()) {
      console.debug('Task update invalid name', { name: request.body.name })
      response.status(400).json({ error: 'Task name must be a non-empty string' })
      return null
    }
    updateData.name = request.body.name
  }

  if ('branch' in request.body) {
    if (typeof request.body.branch !== 'string' || !request.body.branch.trim()) {
      console.debug('Task update invalid branch', {
        branch: request.body.branch,
      })
      response.status(400).json({ error: 'Task branch must be a non-empty string' })
      return null
    }
    updateData.branch = request.body.branch
  }

  if ('container' in request.body) {
    if (typeof request.body.container !== 'string'
      || !request.body.container.trim()
    ) {
      console.debug('Task update invalid container', {
        container: request.body.container,
      })
      response.status(400).json({ error: 'Task container must be a non-empty string' })
      return null
    }
    updateData.container = request.body.container
  }

  if ('archived' in request.body) {
    if (typeof request.body.archived !== 'boolean') {
      console.debug('Task update invalid archived flag', {
        archived: request.body.archived,
      })
      response.status(400).json({ error: 'Task archived must be a boolean' })
      return null
    }
    updateData.archived = request.body.archived
  }

  if (Object.keys(updateData).length === 0) {
    console.debug('Task update request has no valid fields', {
      body: request.body,
    })
    response.status(400).json({ error: 'No valid fields provided for update' })
    return null
  }

  return updateData
}

export function createTasksRouter(): Router {
  const tasksRouter = createRouter()

  tasksRouter.get('/', handleListTasksRequest)
  tasksRouter.get('/:taskId', handleGetTaskRequest)
  tasksRouter.post('/', handleCreateTaskRequest)
  tasksRouter.patch('/:taskId', handleUpdateTaskRequest)
  tasksRouter.delete('/:taskId', handleDeleteTaskRequest)

  return tasksRouter
}

export async function handleListTasksRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  try {
    const tasks = await databaseClient.task.findMany({
      orderBy: { createdAt: 'desc' },
    })
    response.status(200).json({ tasks })
  }
  catch (error) {
    console.error('Failed to list tasks', error)
    response.status(500).json({ error: 'Failed to list tasks' })
  }
}

export async function handleGetTaskRequest(
  request: Request<TaskIdParams>,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  const taskId = getTaskId(request, response)
  if (!taskId) {
    return
  }

  try {
    const task = await databaseClient.task.findUnique({
      where: { id: taskId },
      include: { messages: true },
    })

    if (!task) {
      console.debug('Task not found', { taskId })
      response.status(404).json({ error: 'Task not found' })
      return
    }

    response.status(200).json({ task })
  }
  catch (error) {
    console.error('Failed to fetch task', error)
    response.status(500).json({ error: 'Failed to fetch task' })
  }
}

export async function handleCreateTaskRequest(
  request: Request<unknown, unknown, TaskCreateBody>,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  const taskBody = parseTaskCreateBody(request, response)
  if (!taskBody) {
    return
  }

  try {
    const task = await databaseClient.task.create({
      data: taskBody,
    })
    response.status(201).json({ task })
  }
  catch (error) {
    console.error('Failed to create task', error)
    response.status(500).json({ error: 'Failed to create task' })
  }
}

export async function handleUpdateTaskRequest(
  request: Request<TaskIdParams, unknown, TaskUpdateBody>,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  const taskId = getTaskId(request, response)
  if (!taskId) {
    return
  }

  const updateData = parseTaskUpdateBody(request, response)
  if (!updateData) {
    return
  }

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

export async function handleDeleteTaskRequest(
  request: Request<TaskIdParams>,
  response: Response,
): Promise<void> {
  const databaseClient = getDatabaseClientOrLog(response)
  if (!databaseClient) {
    return
  }

  const taskId = getTaskId(request, response)
  if (!taskId) {
    return
  }

  try {
    const existingTask = await databaseClient.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      console.debug('Task delete failed, task not found', {
        taskId,
      })
      response.status(404).json({ error: 'Task not found' })
      return
    }

    await databaseClient.task.delete({
      where: { id: taskId },
    })

    response.status(200).json({ deleted: true, taskId })
  }
  catch (error) {
    console.error('Failed to delete task', error)
    response.status(500).json({ error: 'Failed to delete task' })
  }
}
