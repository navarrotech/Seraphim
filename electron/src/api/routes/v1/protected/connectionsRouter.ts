// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleDeleteConnectionRequest } from './connections/deleteConnectionRoute'
import { handleGetConnectionRequest } from './connections/getConnectionRoute'
import { handleListConnectionsRequest } from './connections/listConnectionsRoute'
import { handleUpdateConnectionRequest } from './connections/updateConnectionRoute'

export function createConnectionsRouter(): Router {
  const connectionsRouter = createRouter()

  // /api/v1/protected/connections
  connectionsRouter.get('/', handleListConnectionsRequest)
  // /api/v1/protected/connections/:connectionId
  connectionsRouter.get('/:connectionId', handleGetConnectionRequest)
  // /api/v1/protected/connections/:connectionId
  connectionsRouter.patch('/:connectionId', handleUpdateConnectionRequest)
  // /api/v1/protected/connections/:connectionId
  connectionsRouter.delete('/:connectionId', handleDeleteConnectionRequest)

  return connectionsRouter
}
