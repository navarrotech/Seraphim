// Copyright © 2026 Jalapeno Labs

import type { ConnectionRecord } from '@frontend/lib/types/connectionTypes'

// Lib
import { z } from 'zod'

// Utility
import { connectionUpdateSchema } from '@common/schema'

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
