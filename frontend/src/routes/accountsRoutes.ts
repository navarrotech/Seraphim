// Copyright © 2026 Jalapeno Labs

import type {
  AuthAccount,
  StandardUrlParams,
  GithubRepoSummary,
  GithubBranchSummary,
  StandardPaginatedResponseData,
  AuthProvider,
} from '@common/types'
import type { UpsertAccountRequest } from '@common/schema/accounts'

// Core
import { buildUrlParams, parseRequestBeforeSend } from '@common/api'
import { frontendClient } from '@frontend/framework/api'

// Redux
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { dispatch } from '@frontend/framework/store'

// Schema
import { upsertAccountSchema } from '@common/schema/accounts'

// /////////////////////////////// //
//           List Accounts         //
// /////////////////////////////// //

type ListAccountsResponse = {
  accounts: AuthAccount[]
}

// This route intentionally has no pagination
export async function listAccounts(): Promise<ListAccountsResponse> {
  const response = await frontendClient
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
  return frontendClient
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
  return frontendClient
    .get('v1/protected/accounts/branches', {
      searchParams: buildUrlParams(request),
    })
    .json<ListBranchesResponse>()
}

// /////////////////////////////// //
//          Update Account         //
// /////////////////////////////// //

type UpsertAccountResponse = {
  account: AuthAccount
  gitUserName?: string
  gitUserEmail?: string
  githubIdentity?: {
    username?: string
    email?: string | null
  }
  grantedScopes?: string[]
  acceptedScopes?: string[]
}

export async function upsertGitAccount(accountId: string = '', raw: UpsertAccountRequest) {
  const json = parseRequestBeforeSend(upsertAccountSchema, raw)

  const response = await frontendClient
    .post(`v1/protected/accounts/upsert/${accountId}`, { json })
    .json<UpsertAccountResponse>()

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
  const response = await frontendClient
    .delete('v1/protected/accounts', { json })
    .json<RemoveAccountResponse>()

  dispatch(
    accountActions.removeAccount(json.authAccount),
  )

  return response
}
