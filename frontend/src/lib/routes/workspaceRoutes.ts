// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'

import { apiClient } from '../api'

type ListWorkspacesResponse = {
  workspaces: Workspace[]
}

export const listWorkspaces = () => apiClient
  .get('v1/protected/workspaces')
  .json<ListWorkspacesResponse>()

type GetWorkspaceResponse = {
  workspace: Workspace
}

export const getWorkspace = (id: string) => apiClient
  .get(`v1/protected/workspaces/${id}`)
  .json<GetWorkspaceResponse>()

type CreateWorkspaceResponse = {
  workspace: Workspace
}

type CreateWorkspaceRequest = {
  name: string
  repository: string
  containerImage: string
  description?: string
  setupScript?: string
  env?: string[]
  secrets?: string[]
}

export const createWorkspace = (body: CreateWorkspaceRequest) => apiClient
  .post('v1/protected/workspaces', { json: body })
  .json<CreateWorkspaceResponse>()

type UpdateWorkspaceRequestBody = {
  name?: string
  repository?: string
  containerImage?: string
  description?: string
  setupScript?: string
  env?: string[]
  secrets?: string[]
}

type UpdateWorkspaceResponse = {
  workspace: Workspace
}

export const updateWorkspace = (id: string, body: UpdateWorkspaceRequestBody) => apiClient
  .put(`v1/protected/workspaces/${id}`, { json: body })
  .json<UpdateWorkspaceResponse>()

export const deleteWorkspace = (id: string) => apiClient
  .delete(`v1/protected/workspaces/${id}`)
