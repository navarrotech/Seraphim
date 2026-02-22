// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleListLlmsRequest } from './llms/listLlmsRoute'
import { handleUpdateLlmRequest } from './llms/updateLlmRoute'
import { handleDeleteLlmRequest } from './llms/deleteLlmRoute'

export function createLlmsRouter(): Router {
  const llmsRouter = createRouter()

  // /api/v1/protected/llms
  llmsRouter.get('/', handleListLlmsRequest)
  // /api/v1/protected/llms/:llmId
  llmsRouter.patch('/:llmId', handleUpdateLlmRequest)
  // /api/v1/protected/llms/:llmId
  llmsRouter.delete('/:llmId', handleDeleteLlmRequest)

  return llmsRouter
}
