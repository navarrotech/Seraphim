// Copyright © 2026 Jalapeno Labs

import type { Message, Task } from '@prisma/client'

// Lib
import { z } from 'zod'

// Utility
import { taskCreateSchema, taskUpdateSchema } from '@common/schema'

// Misc
import { apiClient } from '../api'

type ListTasksResponse = {
  tasks: Task[]
}

export function listTasks() {
  return apiClient
    .get('v1/protected/tasks')
    .json<ListTasksResponse>()
}

type GetTaskResponse = {
  task: Task & { messages: Message[] }
}

export function getTask(taskId: string) {
  return apiClient
    .get(`v1/protected/tasks/${taskId}`)
    .json<GetTaskResponse>()
}

type CreateTaskRequest = z.infer<typeof taskCreateSchema>

type CreateTaskResponse = {
  task: Task
}

export function createTask(body: CreateTaskRequest) {
  return apiClient
    .post('v1/protected/tasks', { json: body })
    .json<CreateTaskResponse>()
}

type UpdateTaskRequest = z.infer<typeof taskUpdateSchema>

type UpdateTaskResponse = {
  task: Task
}

export function updateTask(taskId: string, body: UpdateTaskRequest) {
  return apiClient
    .patch(`v1/protected/tasks/${taskId}`, { json: body })
    .json<UpdateTaskResponse>()
}

export function deleteTask(taskId: string) {
  return apiClient
    .delete(`v1/protected/tasks/${taskId}`)
}
