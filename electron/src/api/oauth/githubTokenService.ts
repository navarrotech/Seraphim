// Copyright © 2026 Jalapeno Labs

// Lib
import { Octokit } from '@octokit/core'

// Misc
import {
  GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES,
  GITHUB_USER_ENDPOINT_ACCEPTED_SCOPES,
} from '@electron/constants'

export type GithubTokenValidationSuccess = {
  isValid: true
  username: string
  email: string | null
  scope: string
  grantedScopes: string[]
  acceptedScopes: string[]
}

export type GithubTokenValidationFailure = {
  isValid: false
  error: string
  status?: number
  grantedScopes: string[]
  acceptedScopes: string[]
  missingScopes: string[]
}

export type GithubTokenValidationResult =
  | GithubTokenValidationSuccess
  | GithubTokenValidationFailure

function splitScopeHeader(scopeHeader: string | number | null): string[] {
  if (!scopeHeader) {
    return []
  }

  return String(scopeHeader)
    .split(',')
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0)
}

function getMissingScopes(grantedScopes: string[]): string[] {
  const grantedScopeSet = new Set(grantedScopes)
  const missingScopes: string[] = []

  for (const requiredScope of GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES) {
    if (!grantedScopeSet.has(requiredScope)) {
      missingScopes.push(requiredScope)
    }
  }

  return missingScopes
}

export async function validateGithubToken(accessToken: string): Promise<GithubTokenValidationResult> {
  const trimmedToken = accessToken.trim()
  if (!trimmedToken) {
    console.debug('validateGithubToken called with empty token')
    return {
      isValid: false,
      error: 'GitHub token is required',
      grantedScopes: [],
      acceptedScopes: [ ...GITHUB_USER_ENDPOINT_ACCEPTED_SCOPES ],
      missingScopes: [ ...GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES ],
    }
  }

  const octokit = new Octokit({ auth: trimmedToken })

  let response
  try {
    response = await octokit.request('GET /user', {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  }
  catch (error) {
    console.debug('GitHub token validation request failed', { error })

    const status = typeof error === 'object' && error && 'status' in error
      ? Number(error.status)
      : undefined

    return {
      isValid: false,
      error: 'GitHub token failed validation',
      status,
      grantedScopes: [],
      acceptedScopes: [ ...GITHUB_USER_ENDPOINT_ACCEPTED_SCOPES ],
      missingScopes: [ ...GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES ],
    }
  }

  const grantedScopes = splitScopeHeader(response.headers['x-oauth-scopes'] ?? null)
  const acceptedScopes = splitScopeHeader(response.headers['x-accepted-oauth-scopes'] ?? null)
  const missingScopes = getMissingScopes(grantedScopes)

  if (missingScopes.length > 0) {
    console.debug('GitHub token missing required scopes', {
      missingScopes,
      grantedScopes,
    })

    return {
      isValid: false,
      error: `GitHub token is missing required scopes: ${missingScopes.join(', ')}`,
      status: response.status,
      grantedScopes,
      acceptedScopes,
      missingScopes,
    }
  }

  const username = response.data.login?.trim()
  if (!username) {
    console.debug('GitHub token validation response missing login')
    return {
      isValid: false,
      error: 'GitHub token response did not include a username',
      status: response.status,
      grantedScopes,
      acceptedScopes,
      missingScopes: [ ...GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES ],
    }
  }

  const email = typeof response.data.email === 'string' && response.data.email.trim().length > 0
    ? response.data.email.trim()
    : null

  return {
    isValid: true,
    username,
    email,
    scope: grantedScopes.join(','),
    grantedScopes,
    acceptedScopes,
  }
}
