// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { createAccountsRouter } from './accountsRouter'
import { createIssueTrackingAccountsRouter } from './issueTrackingAccountsRouter'
import { createLlmsRouter } from './llmsRouter'
import { createDockerRouter } from './docker/dockerRouter'
import { createTasksRouter } from './tasksRouter'
import { createUsersRouter } from './usersRouter'
import { createWorkspacesRouter } from './workspacesRouter'

export function createProtectedRouter(): Router {
  const protectedRouter = createRouter()

  protectedRouter.use('/accounts', createAccountsRouter())
  protectedRouter.use('/issue-tracking-accounts', createIssueTrackingAccountsRouter())
  protectedRouter.use('/llms', createLlmsRouter())
  protectedRouter.use('/docker', createDockerRouter())
  protectedRouter.use('/workspaces', createWorkspacesRouter())
  protectedRouter.use('/tasks', createTasksRouter())
  protectedRouter.use('/users', createUsersRouter())

  return protectedRouter
}
