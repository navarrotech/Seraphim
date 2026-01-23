// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { createTasksRouter } from './tasksRouter'
import { createWorkspacesRouter } from './workspacesRouter'

export function createProtectedRouter(): Router {
  const protectedRouter = createRouter()

  protectedRouter.use('/workspaces', createWorkspacesRouter())
  protectedRouter.use('/tasks', createTasksRouter())

  return protectedRouter
}
