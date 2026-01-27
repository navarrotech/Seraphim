// Copyright © 2026 Jalapeno Labs

// Misc
import { apiClient } from '../api'

export type OAuthProvider = 'GITHUB'

export type ConnectedAccount = {
  id: string
  provider: OAuthProvider
  providerAccountId: string
  username: string
  displayName: string
  avatarUrl: string | null
  email: string | null
  lastUsedAt: string | null
  createdAt: string
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

type AddAccountRequest = {
  provider: OAuthProvider
  completionRedirectUrl?: string
}

type AddAccountResponse = {
  provider: OAuthProvider
  authorizationUrl: string
  state: string
  scopes: string[]
}

type LogoutAccountRequest = {
  provider: OAuthProvider
  accountId: string
}

type LogoutAccountResponse = {
  provider: OAuthProvider
  accountId: string
  revoked: boolean
}

export function listAccounts() {
  return apiClient
    .get('v1/protected/accounts')
    .json<ListAccountsResponse>()
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
