// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleCreateOpenAiApiKeyLlmRequest } from './llms/createOpenAiApiKeyLlmRoute'
import { handleCreateOpenAiLoginTokenLlmRequest } from './llms/createOpenAiLoginTokenLlmRoute'
import { handleDeleteLlmRequest } from './llms/deleteLlmRoute'
import { handleGetLlmRequest } from './llms/getLlmRoute'
import { handleListLlmsRequest } from './llms/listLlmsRoute'
import { handleUpdateLlmRequest } from './llms/updateLlmRoute'

export function createLlmsRouter(): Router {
  const llmsRouter = createRouter()

  // /api/v1/protected/llms
  llmsRouter.get('/', handleListLlmsRequest)
  // /api/v1/protected/llms/openai-api-key
  llmsRouter.post('/openai-api-key', handleCreateOpenAiApiKeyLlmRequest)
  // /api/v1/protected/llms/openai-login-token
  llmsRouter.post(
    '/openai-login-token',
    handleCreateOpenAiLoginTokenLlmRequest,
  )
  // /api/v1/protected/llms/:llmId
  llmsRouter.get('/:llmId', handleGetLlmRequest)
  // /api/v1/protected/llms/:llmId
  llmsRouter.patch('/:llmId', handleUpdateLlmRequest)
  // /api/v1/protected/llms/:llmId
  llmsRouter.delete('/:llmId', handleDeleteLlmRequest)

  return llmsRouter
}
