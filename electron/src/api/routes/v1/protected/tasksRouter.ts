// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleCreateTaskRequest } from './tasks/createTaskRoute'
import { handleDeleteTaskRequest } from './tasks/deleteTaskRoute'
import { handleGetTaskRequest } from './tasks/getTaskRoute'
import { handleListTasksRequest } from './tasks/listTasksRoute'
import { handleStreamTaskLogsRequest } from './tasks/streamTaskLogsRoute'
import { handleUpdateTaskRequest } from './tasks/updateTaskRoute'

export function createTasksRouter(): Router {
  const tasksRouter = createRouter()

  // /api/v1/protected/tasks
  tasksRouter.get('/', handleListTasksRequest)
  // /api/v1/protected/tasks/:taskId/logs/stream
  tasksRouter.get('/:taskId/logs/stream', handleStreamTaskLogsRequest)
  // /api/v1/protected/tasks/:taskId
  tasksRouter.get('/:taskId', handleGetTaskRequest)
  // /api/v1/protected/tasks
  tasksRouter.post('/', handleCreateTaskRequest)
  // /api/v1/protected/tasks/:taskId
  tasksRouter.patch('/:taskId', handleUpdateTaskRequest)
  // /api/v1/protected/tasks/:taskId
  tasksRouter.delete('/:taskId', handleDeleteTaskRequest)

  return tasksRouter
}
