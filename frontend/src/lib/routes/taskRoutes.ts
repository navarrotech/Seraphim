// Copyright © 2026 Jalapeno Labs

import type { Message, Task } from '@prisma/client'
import type { LlmUsage } from '@common/types'

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

export function getTaskUsage(taskId: string) {
  return apiClient
    .get(`v1/protected/tasks/${taskId}/usage`)
    .json<LlmUsage>()
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


export function archiveTask(taskId: string) {
  return apiClient
    .delete(`v1/protected/tasks/${taskId}/archive`)
}

type TaskGitActionResponse = {
  message: string
}

function postTaskGitAction(taskId: string, actionPath: string) {
  return apiClient
    .post(`v1/protected/tasks/${taskId}/git/${actionPath}`)
    .json<TaskGitActionResponse>()
}

export function refreshTaskGit(taskId: string) {
  return postTaskGitAction(taskId, 'refresh')
}

export function reUpTaskGit(taskId: string) {
  return postTaskGitAction(taskId, 're-up')
}

export function createOrUpdateTaskPullRequest(taskId: string) {
  return postTaskGitAction(taskId, 'pull-request')
}

export function viewTaskRepository(taskId: string) {
  return postTaskGitAction(taskId, 'view-repository')
}
