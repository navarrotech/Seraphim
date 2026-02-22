// Copyright © 2026 Jalapeno Labs

import type { WorkspaceWithEnv } from '@common/types'
import type { WorkspaceCreateRequest, WorkspaceUpdateRequest } from '@common/schema/workspace'

// Core
import { apiClient, parseRequestBeforeSend } from '@common/api'

// Schema
import { workspaceCreateSchema, workspaceUpdateSchema } from '@common/schema/workspace'

// /////////////////////////////// //
//         List Workspaces         //
// /////////////////////////////// //

type ListWorkspacesResponse = {
  workspaces: WorkspaceWithEnv[]
}

export function listWorkspaces() {
  return apiClient
    .get('v1/protected/workspaces')
    .json<ListWorkspacesResponse>()
}

// /////////////////////////////// //
//         Create Workspace        //
// /////////////////////////////// //

type CreateWorkspaceResponse = {
  workspace: WorkspaceWithEnv
}

export const createWorkspaceSchema = workspaceCreateSchema

export type { WorkspaceCreateRequest }

export async function createWorkspace(raw: WorkspaceCreateRequest) {
  const json = parseRequestBeforeSend(workspaceCreateSchema, raw)

  return apiClient
    .post('v1/protected/workspaces', { json })
    .json<CreateWorkspaceResponse>()
}

// /////////////////////////////// //
//         Update Workspace        //
// /////////////////////////////// //

type UpdateWorkspaceResponse = {
  workspace: WorkspaceWithEnv
}

export async function updateWorkspace(workspaceId: string, raw: WorkspaceUpdateRequest) {
  const json = parseRequestBeforeSend(workspaceUpdateSchema, raw)

  return apiClient
    .patch(`v1/protected/workspaces/${workspaceId}`, { json })
    .json<UpdateWorkspaceResponse>()
}

// /////////////////////////////// //
//         Delete Workspace        //
// /////////////////////////////// //

export function deleteWorkspace(workspaceId: string) {
  return apiClient
    .delete(`v1/protected/workspaces/${workspaceId}`)
}
