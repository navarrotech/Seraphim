// Copyright © 2026 Jalapeno Labs

// Redux
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { dispatch } from '@frontend/framework/store'

// Misc
import { apiClient } from '../api'

export type AuthProvider = 'GITHUB'

export type ConnectedAccount = {
  id: string
  provider: AuthProvider
  name: string
  username: string
  email: string
  tokenPreview: string
  scope: string
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

export type GithubRepoSummary = {
  id: number
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  cloneUrl: string
  sshUrl: string
  defaultBranch: string
  ownerLogin: string
  isPrivate: boolean
  isFork: boolean
  isArchived: boolean
  updatedAt: string
}

type ListAccountsResponse = {
  accounts: ConnectedAccount[]
}

type RepoAccountResult = {
  accountId: string
  username: string
  name: string
  email: string
  repos: GithubRepoSummary[]
}

type RepoAccountFailure = {
  accountId: string
  username: string
  error: string
}

export type ListReposResponse = {
  results: RepoAccountResult[]
  failures: RepoAccountFailure[]
}

export type AddAccountRequest = {
  provider: AuthProvider
  name: string
  accessToken: string
  gitUserName: string
  gitUserEmail: string
}

export type AddAccountResponse = {
  account: ConnectedAccount
  gitUserName: string
  gitUserEmail: string
  githubIdentity: {
    username: string
    email: string | null
  }
  grantedScopes: string[]
  acceptedScopes: string[]
}


export type UpdateConnectedAccountRequest = {
  name?: string
  accessToken?: string
  gitUserEmail?: string
}

export type UpdateConnectedAccountResponse = {
  account: ConnectedAccount
}

type LogoutAccountRequest = {
  provider: AuthProvider
  accountId: string
}

type LogoutAccountResponse = {
  provider: AuthProvider
  accountId: string
  revoked: boolean
}

export async function listAccounts(): Promise<ListAccountsResponse> {
  try {
    const response = await apiClient
      .get('v1/protected/accounts')
      .json<ListAccountsResponse>()

    dispatch(
      accountActions.setAccounts(response.accounts),
    )

    return response
  }
  catch (error) {
    console.debug('ConnectedAccounts failed to refresh accounts', { error })
  }

  return undefined
}

function buildRepoSearchParams(searchQuery?: string) {
  const params: Record<string, string> = {}

  if (searchQuery) {
    const trimmedQuery = searchQuery.trim()
    if (trimmedQuery) {
      params.q = trimmedQuery
    }
  }

  return params
}

export function listRepos(searchQuery?: string) {
  return apiClient
    .get('v1/protected/accounts/repos', {
      searchParams: buildRepoSearchParams(searchQuery),
    })
    .json<ListReposResponse>()
}

export function addAccount(payload: AddAccountRequest) {
  return apiClient
    .post('v1/protected/accounts/add', { json: payload })
    .json<AddAccountResponse>()
}

export function logoutAccount(payload: LogoutAccountRequest) {
  return apiClient
    .post('v1/protected/accounts/logout', { json: payload })
    .json<LogoutAccountResponse>()
}

export function updateConnectedAccount(accountId: string, payload: UpdateConnectedAccountRequest) {
  return apiClient
    .patch(`v1/protected/accounts/${accountId}`, { json: payload })
    .json<UpdateConnectedAccountResponse>()
}
