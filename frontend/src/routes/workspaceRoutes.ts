// Copyright © 2026 Jalapeno Labs

import type { WorkspaceWithEnv } from '@common/types'
import type { WorkspaceCreateRequest, WorkspaceUpdateRequest } from '@common/schema/workspace'

// Core
import { parseRequestBeforeSend } from '@common/api'
import { frontendClient } from '@frontend/framework/api'

// Redux
import { workspaceActions } from '@frontend/framework/redux/stores/workspaces'
import { dispatch } from '@frontend/framework/store'

// Schema
import { workspaceCreateSchema, workspaceUpdateSchema } from '@common/schema/workspace'

// /////////////////////////////// //
//         List Workspaces         //
// /////////////////////////////// //

type ListWorkspacesResponse = {
  workspaces: WorkspaceWithEnv[]
}

export async function listWorkspaces() {
  const response = await frontendClient
    .get('v1/protected/workspaces')
    .json<ListWorkspacesResponse>()

  dispatch(
    workspaceActions.setWorkspaces(response.workspaces),
  )

  return response
}

// /////////////////////////////// //
//         Create Workspace        //
// /////////////////////////////// //

type CreateWorkspaceResponse = {
  workspace: WorkspaceWithEnv
}

export const createWorkspaceSchema = workspaceCreateSchema

export async function createWorkspace(raw: WorkspaceCreateRequest) {
  const json = parseRequestBeforeSend(workspaceCreateSchema, raw)

  const response = await frontendClient
    .post('v1/protected/workspaces', { json })
    .json<CreateWorkspaceResponse>()

  dispatch(
    workspaceActions.upsertWorkspace(response.workspace),
  )

  return response
}

// /////////////////////////////// //
//         Update Workspace        //
// /////////////////////////////// //

type UpdateWorkspaceResponse = {
  workspace: WorkspaceWithEnv
}

export async function updateWorkspace(workspaceId: string, raw: WorkspaceUpdateRequest) {
  const json = parseRequestBeforeSend(workspaceUpdateSchema, raw)

  const response = await frontendClient
    .patch(`v1/protected/workspaces/${workspaceId}`, { json })
    .json<UpdateWorkspaceResponse>()

  dispatch(
    workspaceActions.upsertWorkspace(response.workspace),
  )

  return response
}

// /////////////////////////////// //
//         Delete Workspace        //
// /////////////////////////////// //

type DeleteWorkspaceRequest = {
  id: string
}

type DeleteWorkspaceResponse = {
  deleted: boolean
  workspace: WorkspaceWithEnv
}

export async function deleteWorkspace(request: DeleteWorkspaceRequest) {
  const response = await frontendClient
    .delete(`v1/protected/workspaces/${request.id}`)
    .json<DeleteWorkspaceResponse>()

  dispatch(
    workspaceActions.removeWorkspace(response.workspace),
  )

  return response
}
