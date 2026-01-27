// Copyright © 2026 Jalapeno Labs

import type { AuthAccount, PrismaClient } from '@prisma/client'
import type { OAuthAccountProfile, OAuthAuthorizationResult } from './oauthTypes'

// Lib
import { Octokit } from '@octokit/core'
import { deleteAuthorization, exchangeWebFlowCode, getWebFlowAuthorizationUrl } from '@octokit/oauth-methods'
import { z } from 'zod'

// Utility
import { APP_ORIGIN, GITHUB_OAUTH_DEFAULT_SCOPES } from '@electron/constants'
import {
  API_PORT,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
} from '@electron/env'
import { createOAuthStateRecord } from './oauthStateService'

export type GithubAuthorizationOptions = {
  completionRedirectUrl?: string
}

const githubProfileSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
})

const githubEmailSchema = z.object({
  email: z.string(),
  primary: z.boolean(),
  verified: z.boolean(),
  visibility: z.string().nullable(),
})

const githubEmailListSchema = z.array(githubEmailSchema)

type GithubProfile = z.infer<typeof githubProfileSchema>

function resolveCompletionRedirectUrl(completionRedirectUrl?: string): string | null {
  if (completionRedirectUrl && completionRedirectUrl.trim().length > 0) {
    return completionRedirectUrl.trim()
  }

  return APP_ORIGIN
}

function getGithubCallbackUrl(): string | null {
  if (!API_PORT || API_PORT <= 0) {
    console.debug('Github OAuth callback URL missing API_PORT')
    return null
  }

  return `http://localhost:${API_PORT}/api/v1/oauth/github/callback`
}

function ensureGithubOAuthConfig(): boolean {
  if (!GITHUB_OAUTH_CLIENT_ID || !GITHUB_OAUTH_CLIENT_SECRET) {
    console.debug('Github OAuth configuration missing', {
      hasClientId: Boolean(GITHUB_OAUTH_CLIENT_ID),
      hasClientSecret: Boolean(GITHUB_OAUTH_CLIENT_SECRET),
    })
    return false
  }

  return true
}

async function fetchGithubProfile(octokit: Octokit): Promise<GithubProfile | null> {
  try {
    const response = await octokit.request('GET /user')
    const parsed = githubProfileSchema.safeParse(response.data)
    if (!parsed.success) {
      console.debug('Github profile payload failed validation', parsed.error)
      return null
    }

    return parsed.data
  }
  catch (error) {
    console.error('Failed to fetch Github profile', error)
    return null
  }
}

async function fetchGithubPrimaryEmail(octokit: Octokit): Promise<string | null> {
  try {
    const response = await octokit.request('GET /user/emails')
    const parsed = githubEmailListSchema.safeParse(response.data)
    if (!parsed.success) {
      console.debug('Github email payload failed validation', parsed.error)
      return null
    }

    const emailRecords = parsed.data

    const primaryVerified = emailRecords.find((record) => record.primary && record.verified)
    if (primaryVerified) {
      return primaryVerified.email
    }

    const primary = emailRecords.find((record) => record.primary)
    if (primary) {
      return primary.email
    }

    const verified = emailRecords.find((record) => record.verified)
    if (verified) {
      return verified.email
    }

    if (emailRecords.length > 0) {
      return emailRecords[0].email
    }

    return null
  }
  catch (error) {
    console.debug('Failed to fetch Github email list', error)
    return null
  }
}

function buildDisplayName(profile: GithubProfile): string {
  if (profile.name && profile.name.trim().length > 0) {
    return profile.name.trim()
  }

  return profile.login
}

export async function createGithubAuthorizationUrl(
  databaseClient: PrismaClient,
  options: GithubAuthorizationOptions,
): Promise<OAuthAuthorizationResult | null> {
  if (!ensureGithubOAuthConfig()) {
    return null
  }

  const callbackUrl = getGithubCallbackUrl()
  if (!callbackUrl) {
    console.debug('Github OAuth add account requested without a callback URL')
    return null
  }

  const scopes = [
    ...GITHUB_OAUTH_DEFAULT_SCOPES,
  ]
  const completionRedirectUrl = resolveCompletionRedirectUrl(options.completionRedirectUrl)

  const stateRecord = await createOAuthStateRecord(databaseClient, {
    provider: 'GITHUB',
    callbackUrl,
    completionRedirectUrl,
    scopes,
  })

  if (!stateRecord) {
    console.debug('Failed to persist Github OAuth state record')
    return null
  }

  const authorization = getWebFlowAuthorizationUrl({
    clientType: 'oauth-app',
    clientId: GITHUB_OAUTH_CLIENT_ID,
    redirectUrl: callbackUrl,
    scopes,
    state: stateRecord.state,
  })

  return {
    provider: 'GITHUB',
    authorizationUrl: authorization.url,
    state: stateRecord.state,
    scopes,
  }
}

export async function createGithubAccountFromCallback(
  databaseClient: PrismaClient,
  code: string,
  callbackUrl: string,
): Promise<AuthAccount | null> {
  if (!ensureGithubOAuthConfig()) {
    return null
  }

  try {
    const exchangeResult = await exchangeWebFlowCode({
      clientType: 'oauth-app',
      clientId: GITHUB_OAUTH_CLIENT_ID,
      clientSecret: GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirectUrl: callbackUrl,
    })

    const authentication = exchangeResult.authentication
    if (!authentication || !authentication.token) {
      console.debug('Github OAuth exchange did not return a token', { authentication })
      return null
    }

    const scopes = Array.isArray(authentication.scopes)
      ? authentication.scopes
      : []

    const scope = exchangeResult.data?.scope ?? scopes.join(',')
    const tokenType = exchangeResult.data?.token_type ?? 'bearer'

    const octokit = new Octokit({
      auth: authentication.token,
    })

    const profile = await fetchGithubProfile(octokit)
    if (!profile) {
      console.debug('Github OAuth exchange returned no profile')
      return null
    }

    const email = profile.email ?? await fetchGithubPrimaryEmail(octokit)
    const providerAccountId = String(profile.id)

    const accountProfile: OAuthAccountProfile = {
      provider: 'GITHUB',
      providerAccountId,
      username: profile.login,
      displayName: buildDisplayName(profile),
      avatarUrl: profile.avatar_url,
      email,
      accessToken: authentication.token,
      tokenType,
      scope,
    }

    return await databaseClient.authAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: accountProfile.provider,
          providerAccountId: accountProfile.providerAccountId,
        },
      },
      create: {
        provider: accountProfile.provider,
        providerAccountId: accountProfile.providerAccountId,
        username: accountProfile.username,
        displayName: accountProfile.displayName,
        avatarUrl: accountProfile.avatarUrl,
        email: accountProfile.email,
        accessToken: accountProfile.accessToken,
        tokenType: accountProfile.tokenType,
        scope: accountProfile.scope,
        lastUsedAt: new Date(),
      },
      update: {
        username: accountProfile.username,
        displayName: accountProfile.displayName,
        avatarUrl: accountProfile.avatarUrl,
        email: accountProfile.email,
        accessToken: accountProfile.accessToken,
        tokenType: accountProfile.tokenType,
        scope: accountProfile.scope,
        lastUsedAt: new Date(),
      },
    })
  }
  catch (error) {
    console.error('Failed to complete Github OAuth flow', error)
    return null
  }
}

export async function revokeGithubAuthorization(accessToken: string): Promise<boolean> {
  if (!ensureGithubOAuthConfig()) {
    return false
  }

  if (!accessToken) {
    console.debug('Github OAuth revoke requested without an access token')
    return false
  }

  try {
    await deleteAuthorization({
      clientType: 'oauth-app',
      clientId: GITHUB_OAUTH_CLIENT_ID,
      clientSecret: GITHUB_OAUTH_CLIENT_SECRET,
      token: accessToken,
    })
    return true
  }
  catch (error) {
    console.error('Failed to revoke Github OAuth authorization', error)
    return false
  }
}
