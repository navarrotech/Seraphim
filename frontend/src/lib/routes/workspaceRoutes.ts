// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'

// Lib
import { z } from 'zod'

// Misc
import { apiClient } from '../api'

type ListWorkspacesResponse = {
  workspaces: Workspace[]
}

export function listWorkspaces() {
  return apiClient
    .get('v1/protected/workspaces')
    .json<ListWorkspacesResponse>()
}

type GetWorkspaceResponse = {
  workspace: Workspace
}

export function getWorkspace(workspaceId: string) {
  return apiClient
    .get(`v1/protected/workspaces/${workspaceId}`)
    .json<GetWorkspaceResponse>()
}

type CreateWorkspaceResponse = {
  workspace: Workspace
}

export const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  repository: z.string().min(1),
  containerImage: z.string().min(1),
  description: z.string().optional(),
  setupScript: z.string().optional(),
  postScript: z.string().optional(),
  cacheFiles: z.array(z.string()).optional(),
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
}

type UpdateWorkspaceResponse = {
  workspace: Workspace
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
