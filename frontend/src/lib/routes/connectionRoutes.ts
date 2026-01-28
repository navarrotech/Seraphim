// Copyright © 2026 Jalapeno Labs

import type { ConnectionRecord } from '@frontend/lib/types/connectionTypes'

// Lib
import { z } from 'zod'

// Utility
import {
  connectionUpdateSchema,
  kimiApiKeyConnectionCreateSchema,
  openAiApiKeyConnectionCreateSchema,
  openAiLoginTokenConnectionCreateSchema,
} from '@common/schema'

// Misc
import { apiClient } from '../api'

type ListConnectionsResponse = {
  connections: ConnectionRecord[]
}

export function listConnections() {
  return apiClient
    .get('v1/protected/connections')
    .json<ListConnectionsResponse>()
}

type CreateConnectionResponse = {
  connection: ConnectionRecord
}

type CreateOpenAiApiKeyConnectionRequestBody = z.infer<
  typeof openAiApiKeyConnectionCreateSchema
>

export function createOpenAiApiKeyConnection(
  body: CreateOpenAiApiKeyConnectionRequestBody,
) {
  return apiClient
    .post('v1/protected/connections/openai-api-key', { json: body })
    .json<CreateConnectionResponse>()
}

type CreateKimiApiKeyConnectionRequestBody = z.infer<
  typeof kimiApiKeyConnectionCreateSchema
>

export function createKimiApiKeyConnection(
  body: CreateKimiApiKeyConnectionRequestBody,
) {
  return apiClient
    .post('v1/protected/connections/kimi-api-key', { json: body })
    .json<CreateConnectionResponse>()
}

type CreateOpenAiLoginTokenConnectionRequestBody = z.infer<
  typeof openAiLoginTokenConnectionCreateSchema
>

export function createOpenAiLoginTokenConnection(
  body: CreateOpenAiLoginTokenConnectionRequestBody,
) {
  return apiClient
    .post('v1/protected/connections/openai-login-token', { json: body })
    .json<CreateConnectionResponse>()
}

type GetConnectionResponse = {
  connection: ConnectionRecord
}

export function getConnection(connectionId: string) {
  return apiClient
    .get(`v1/protected/connections/${connectionId}`)
    .json<GetConnectionResponse>()
}

type UpdateConnectionRequestBody = z.infer<typeof connectionUpdateSchema>

type UpdateConnectionResponse = {
  connection: ConnectionRecord
}

export function updateConnection(
  connectionId: string,
  body: UpdateConnectionRequestBody,
) {
  return apiClient
    .patch(`v1/protected/connections/${connectionId}`, { json: body })
    .json<UpdateConnectionResponse>()
}

export function deleteConnection(connectionId: string) {
  return apiClient
    .delete(`v1/protected/connections/${connectionId}`)
}
