// Copyright © 2026 Jalapeno Labs

import type {
  AuthAccount,
  StandardUrlParams,
  GithubRepoSummary,
  GithubBranchSummary,
  StandardPaginatedResponseData,
  AuthProvider,
} from '@common/types'
import type { AddAccountRequest, UpdateAccountRequest } from '@common/schema/accounts'

// Core
import { apiClient, buildUrlParams, parseRequestBeforeSend } from '@common/api'

// Redux
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { dispatch } from '@frontend/framework/store'

// Schema
import { addAccountSchema, updateAccountSchema } from '@common/schema/accounts'

// /////////////////////////////// //
//           List Accounts         //
// /////////////////////////////// //

type ListAccountsResponse = {
  accounts: AuthAccount[]
}

// This route intentionally has no pagination
export async function listAccounts(): Promise<ListAccountsResponse> {
  const response = await apiClient
    .get('v1/protected/accounts')
    .json<ListAccountsResponse>()

  dispatch(
    accountActions.setAccounts(response.accounts),
  )

  return response
}

// /////////////////////////////// //
//        List Account Repos       //
// /////////////////////////////// //

// TODO: API needs pagination!
type ListReposRequest = StandardUrlParams
type ListReposResponse = StandardPaginatedResponseData & {
  results: {
    accountId: string
    username: string
    name: string
    email: string
    repos: GithubRepoSummary[]
  }[]
  failures: {
    accountId: string
    username: string
    error: string
  }[]
}

export function listRepos(request: ListReposRequest) {
  return apiClient
    .get('v1/protected/accounts/repos', {
      searchParams: buildUrlParams(request),
    })
    .json<ListReposResponse>()
}

// /////////////////////////////// //
//      List Account Branches      //
// /////////////////////////////// //

type ListBranchesRequest = StandardUrlParams & {
  workspaceId: string
  authAccountId: string
}

type ListBranchesResponse = StandardPaginatedResponseData & {
  workspaceId: string
  authAccountId: string
  repoPath: string
  defaultBranch: string | null
  branches: GithubBranchSummary[]
}

export function listBranches(request: ListBranchesRequest) {
  return apiClient
    .get('v1/protected/accounts/branches', {
      searchParams: buildUrlParams(request),
    })
    .json<ListBranchesResponse>()
}


// /////////////////////////////// //
//           Add Account           //
// /////////////////////////////// //

type AddAccountResponse = {
  account: AuthAccount
  gitUserName: string
  gitUserEmail: string
  githubIdentity: {
    username: string
    email: string | null
  }
  grantedScopes: string[]
  acceptedScopes: string[]
}

export async function addAccount(raw: AddAccountRequest) {
  const json = parseRequestBeforeSend(addAccountSchema, raw)

  const response = await apiClient
    .post('v1/protected/accounts/upsert', { json })
    .json<AddAccountResponse>()

  dispatch(
    accountActions.upsertAccount(response.account),
  )

  return response
}

// /////////////////////////////// //
//          Update Account         //
// /////////////////////////////// //

type UpdateAccountResponse = {
  account: AuthAccount
}

export async function upsertConnectedAccount(accountId: string = '', raw: UpdateAccountRequest) {
  const json = parseRequestBeforeSend(updateAccountSchema, raw)

  const response = await apiClient
    .post(`v1/protected/accounts/upsert/${accountId}`, { json })
    .json<UpdateAccountResponse>()

  dispatch(
    accountActions.upsertAccount(response.account),
  )

  return response
}

// /////////////////////////////// //
//          Remove Account         //
// /////////////////////////////// //

type RemoveAccountRequest = {
  authAccount: AuthAccount
}

type RemoveAccountResponse = {
  provider: AuthProvider
  accountId: string
  revoked: boolean
}

export async function removeAccount(json: RemoveAccountRequest) {
  const response = await apiClient
    .delete('v1/protected/accounts', { json })
    .json<RemoveAccountResponse>()

  dispatch(
    accountActions.removeAccount(json.authAccount),
  )

  return response
}
