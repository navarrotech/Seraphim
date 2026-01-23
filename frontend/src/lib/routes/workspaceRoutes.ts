// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'
import type { Workspace, WorkspaceEnv } from '@prisma/client'

// Lib
import { z } from 'zod'

// Utility
import { environmentSchema } from '@common/schema'

// Misc
import { apiClient } from '../api'

type WorkspaceResponse = Workspace & { envEntries: WorkspaceEnv[] }

type ListWorkspacesResponse = {
  workspaces: WorkspaceResponse[]
}

export function listWorkspaces() {
  return apiClient
    .get('v1/protected/workspaces')
    .json<ListWorkspacesResponse>()
}

type GetWorkspaceResponse = {
  workspace: WorkspaceResponse
}

export function getWorkspace(workspaceId: string) {
  return apiClient
    .get(`v1/protected/workspaces/${workspaceId}`)
    .json<GetWorkspaceResponse>()
}

type CreateWorkspaceResponse = {
  workspace: WorkspaceResponse
}

export const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  repository: z.string().min(1),
  containerImage: z.string().min(1),
  description: z.string().optional(),
  setupScript: z.string().optional(),
  postScript: z.string().optional(),
  cacheFiles: z.array(z.string()).optional(),
  envEntries: z.array(environmentSchema).optional(),
})

export type CreateWorkspaceRequest = z.infer<typeof createWorkspaceSchema>

export function createWorkspace(body: CreateWorkspaceRequest) {
  return apiClient
    .post('v1/protected/workspaces', { json: body })
    .json<CreateWorkspaceResponse>()
}

type UpdateWorkspaceRequestBody = {
  name?: string
  repository?: string
  containerImage?: string
  description?: string
  setupScript?: string
  postScript?: string
  cacheFiles?: string[]
  envEntries?: Environment[]
}

type UpdateWorkspaceResponse = {
  workspace: WorkspaceResponse
}

export function updateWorkspace(workspaceId: string, body: UpdateWorkspaceRequestBody) {
  return apiClient
    .patch(`v1/protected/workspaces/${workspaceId}`, { json: body })
    .json<UpdateWorkspaceResponse>()
}

export function deleteWorkspace(workspaceId: string) {
  return apiClient
    .delete(`v1/protected/workspaces/${workspaceId}`)
}
