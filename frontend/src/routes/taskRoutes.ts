// Copyright © 2026 Jalapeno Labs

import type { Message, Task, LlmUsage } from '@common/types'
import type {
  TaskCreateRequest,
  TaskUpdateRequest,
} from '@common/schema/task'

// Core
import { apiClient, parseRequestBeforeSend } from '@common/api'

// Schema
import { taskCreateSchema, taskUpdateSchema } from '@common/schema/task'

// /////////////////////////////// //
//           List Tasks            //
// /////////////////////////////// //

type ListTasksResponse = {
  tasks: Task[]
}

export function listTasks() {
  return apiClient
    .get('v1/protected/tasks')
    .json<ListTasksResponse>()
}

// /////////////////////////////// //
//            Get Task             //
// /////////////////////////////// //

type GetTaskResponse = {
  task: Task & { messages: Message[] }
}

export function getTask(taskId: string) {
  return apiClient
    .get(`v1/protected/tasks/${taskId}`)
    .json<GetTaskResponse>()
}

// /////////////////////////////// //
//          Get Task Usage         //
// /////////////////////////////// //

export function getTaskUsage(taskId: string) {
  return apiClient
    .get(`v1/protected/tasks/${taskId}/usage`)
    .json<LlmUsage>()
}

// /////////////////////////////// //
//           Create Task           //
// /////////////////////////////// //

type CreateTaskResponse = {
  task: Task
}

export async function createTask(raw: TaskCreateRequest) {
  const json = parseRequestBeforeSend(taskCreateSchema, raw)

  return apiClient
    .post('v1/protected/tasks', { json })
    .json<CreateTaskResponse>()
}

// /////////////////////////////// //
//           Update Task           //
// /////////////////////////////// //

type UpdateTaskResponse = {
  task: Task
}

export async function updateTask(taskId: string, raw: TaskUpdateRequest) {
  const json = parseRequestBeforeSend(taskUpdateSchema, raw)

  return apiClient
    .patch(`v1/protected/tasks/${taskId}`, { json })
    .json<UpdateTaskResponse>()
}

// /////////////////////////////// //
//           Delete Task           //
// /////////////////////////////// //

export function deleteTask(taskId: string) {
  return apiClient
    .delete(`v1/protected/tasks/${taskId}`)
}

// /////////////////////////////// //
//          Archive Task           //
// /////////////////////////////// //

export function archiveTask(taskId: string) {
  return apiClient
    .delete(`v1/protected/tasks/${taskId}/archive`)
}

// /////////////////////////////// //
//         Task Git Actions        //
// /////////////////////////////// //

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
