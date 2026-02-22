// Copyright © 2026 Jalapeno Labs

import type { LlmRecord } from '@common/types'
import type { RateLimitSnapshot } from '@common/vendor/codex-protocol/v2/RateLimitSnapshot'

// Lib
import { z } from 'zod'

// Utility
import {
  llmUpdateSchema,
  openAiApiKeyLlmCreateSchema,
  openAiLoginTokenLlmCreateSchema,
} from '@common/schema'

// Misc
import { apiClient } from '../api'

type ListLlmsResponse = {
  llms: LlmRecord[]
}

export function listLlms() {
  return apiClient
    .get('v1/protected/llms')
    .json<ListLlmsResponse>()
}

type CreateLlmResponse = {
  llm: LlmRecord
}

type CreateOpenAiApiKeyLlmRequestBody = z.infer<
  typeof openAiApiKeyLlmCreateSchema
>

export function createOpenAiApiKeyLlm(
  body: CreateOpenAiApiKeyLlmRequestBody,
) {
  return apiClient
    .post('v1/protected/llms/openai-api-key', { json: body })
    .json<CreateLlmResponse>()
}


type CreateOpenAiLoginTokenLlmRequestBody = z.infer<
  typeof openAiLoginTokenLlmCreateSchema
>

export function createOpenAiLoginTokenLlm(
  body: CreateOpenAiLoginTokenLlmRequestBody,
) {
  return apiClient
    .post('v1/protected/llms/openai-login-token', { json: body })
    .json<CreateLlmResponse>()
}

type GetLlmResponse = {
  llm: LlmRecord
}

export function getLlm(llmId: string) {
  return apiClient
    .get(`v1/protected/llms/${llmId}`)
    .json<GetLlmResponse>()
}

type GetLlmRateLimitsResponse = {
  llmId: string
  rateLimits: RateLimitSnapshot | null
}

export function getLlmRateLimits(llmId: string) {
  return apiClient
    .get(`v1/protected/llms/${llmId}/rate-limits`)
    .json<GetLlmRateLimitsResponse>()
}

type UpdateLlmRequestBody = z.infer<typeof llmUpdateSchema>

type UpdateLlmResponse = {
  llm: LlmRecord
}

export function updateLlm(
  llmId: string,
  body: UpdateLlmRequestBody,
) {
  return apiClient
    .patch(`v1/protected/llms/${llmId}`, { json: body })
    .json<UpdateLlmResponse>()
}

export function deleteLlm(llmId: string) {
  return apiClient
    .delete(`v1/protected/llms/${llmId}`)
}
