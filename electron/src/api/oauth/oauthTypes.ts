// Copyright © 2026 Jalapeno Labs

export type OAuthProvider = 'GITHUB'

export type OAuthAddAccountRequest = {
  provider: OAuthProvider
  completionRedirectUrl?: string
}

export type OAuthAuthorizationResult = {
  provider: OAuthProvider
  authorizationUrl: string
  state: string
  scopes: string[]
}

export type OAuthLogoutRequest = {
  provider: OAuthProvider
  accountId: string
}

export type OAuthAccountProfile = {
  provider: OAuthProvider
  providerAccountId: string
  username: string
  displayName: string
  avatarUrl: string | null
  email: string | null
  accessToken: string
  tokenType: string
  scope: string
}
