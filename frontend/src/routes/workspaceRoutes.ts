// Copyright © 2026 Jalapeno Labs

import type { Workspace, WorkspaceEnv } from '@common/types'

// Lib
import { z } from 'zod'

// Utility
import {
  workspaceCreateSchema,
  workspaceUpdateSchema,
} from '@common/schema'

// Misc
import { apiClient } from '../../../common/src/api'

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

export const createWorkspaceSchema = workspaceCreateSchema

export type CreateWorkspaceRequest = z.infer<typeof workspaceCreateSchema>

export function createWorkspace(body: CreateWorkspaceRequest) {
  return apiClient
    .post('v1/protected/workspaces', { json: body })
    .json<CreateWorkspaceResponse>()
}

type UpdateWorkspaceRequestBody = z.infer<typeof workspaceUpdateSchema>

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
