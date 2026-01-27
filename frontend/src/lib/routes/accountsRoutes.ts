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

type ListAccountsResponse = {
  accounts: ConnectedAccount[]
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

