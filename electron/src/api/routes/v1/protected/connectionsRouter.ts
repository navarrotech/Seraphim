// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleCreateKimiApiKeyConnectionRequest } from './connections/createKimiApiKeyConnectionRoute'
import { handleCreateOpenAiApiKeyConnectionRequest } from './connections/createOpenAiApiKeyConnectionRoute'
import { handleCreateOpenAiLoginTokenConnectionRequest } from './connections/createOpenAiLoginTokenConnectionRoute'
import { handleDeleteConnectionRequest } from './connections/deleteConnectionRoute'
import { handleGetConnectionRequest } from './connections/getConnectionRoute'
import { handleListConnectionsRequest } from './connections/listConnectionsRoute'
import { handleUpdateConnectionRequest } from './connections/updateConnectionRoute'

export function createConnectionsRouter(): Router {
  const connectionsRouter = createRouter()

  // /api/v1/protected/connections
  connectionsRouter.get('/', handleListConnectionsRequest)
  // /api/v1/protected/connections/openai-api-key
  connectionsRouter.post('/openai-api-key', handleCreateOpenAiApiKeyConnectionRequest)
  // /api/v1/protected/connections/kimi-api-key
  connectionsRouter.post('/kimi-api-key', handleCreateKimiApiKeyConnectionRequest)
  // /api/v1/protected/connections/openai-login-token
  connectionsRouter.post(
    '/openai-login-token',
    handleCreateOpenAiLoginTokenConnectionRequest,
  )
  // /api/v1/protected/connections/:connectionId
  connectionsRouter.get('/:connectionId', handleGetConnectionRequest)
  // /api/v1/protected/connections/:connectionId
  connectionsRouter.patch('/:connectionId', handleUpdateConnectionRequest)
  // /api/v1/protected/connections/:connectionId
  connectionsRouter.delete('/:connectionId', handleDeleteConnectionRequest)

  return connectionsRouter
}
