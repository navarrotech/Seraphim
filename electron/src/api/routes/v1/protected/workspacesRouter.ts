// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleCreateWorkspaceRequest } from './workspaces/createWorkspaceRoute'
import { handleDeleteWorkspaceRequest } from './workspaces/deleteWorkspaceRoute'
import { handleGetWorkspaceRequest } from './workspaces/getWorkspaceRoute'
import { handleListWorkspacesRequest } from './workspaces/listWorkspacesRoute'
import { handleUpdateWorkspaceRequest } from './workspaces/updateWorkspaceRoute'

export function createWorkspacesRouter(): Router {
  const workspacesRouter = createRouter()

  // /api/v1/protected/workspaces
  workspacesRouter.get('/', handleListWorkspacesRequest)
  // /api/v1/protected/workspaces/:workspaceId
  workspacesRouter.get('/:workspaceId', handleGetWorkspaceRequest)
  // /api/v1/protected/workspaces
  workspacesRouter.post('/', handleCreateWorkspaceRequest)
  // /api/v1/protected/workspaces/:workspaceId
  workspacesRouter.patch('/:workspaceId', handleUpdateWorkspaceRequest)
  // /api/v1/protected/workspaces/:workspaceId
  workspacesRouter.delete('/:workspaceId', handleDeleteWorkspaceRequest)

  return workspacesRouter
}
