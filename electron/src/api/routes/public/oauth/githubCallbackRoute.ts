// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { createGithubAccountFromCallback } from '@electron/api/oauth/githubOAuthService'
import { consumeOAuthStateRecord } from '@electron/api/oauth/oauthStateService'
import { parseRequestQuery } from '../../v1/validation'

const githubCallbackSchema = z.object({
  code: z.string().trim().min(1),
  state: z.string().trim().min(1),
})

type CompletionPayload = {
  provider: string
  status: 'success' | 'error'
  accountId?: string
  error?: string
}

function buildCompletionRedirectUrl(
  completionRedirectUrl: string | null,
  payload: CompletionPayload,
): string | null {
  if (!completionRedirectUrl) {
    return null
  }

  try {
    const redirectUrl = new URL(completionRedirectUrl)
    redirectUrl.searchParams.set('provider', payload.provider)
    redirectUrl.searchParams.set('status', payload.status)

    if (payload.accountId) {
      redirectUrl.searchParams.set('accountId', payload.accountId)
    }

    if (payload.error) {
      redirectUrl.searchParams.set('error', payload.error)
    }

    return redirectUrl.toString()
  }
  catch (error) {
    console.debug('Failed to construct OAuth completion redirect URL', {
      completionRedirectUrl,
      error,
    })
    return null
  }
}

function respondWithOAuthError(
  response: Response,
  completionRedirectUrl: string | null,
  message: string,
): void {
  const redirectUrl = buildCompletionRedirectUrl(completionRedirectUrl, {
    provider: 'GITHUB',
    status: 'error',
    error: message,
  })

  if (redirectUrl) {
    response.redirect(redirectUrl)
    return
  }

  response.status(400).json({ error: message })
}

export async function handleGithubCallbackRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const query = parseRequestQuery(
    githubCallbackSchema,
    request,
    response,
    {
      context: 'Github OAuth callback',
      errorMessage: 'Invalid Github OAuth callback request',
    },
  )

  if (!query) {
    console.debug('Github OAuth callback failed validation')
    return
  }

  const databaseClient = requireDatabaseClient('Github OAuth callback')

  const stateRecord = await consumeOAuthStateRecord(databaseClient, query.state)
  if (!stateRecord) {
    console.debug('Github OAuth callback state not found or expired', {
      state: query.state,
    })
    respondWithOAuthError(response, null, 'OAuth state invalid or expired')
    return
  }

  if (stateRecord.provider !== 'GITHUB') {
    console.debug('Github OAuth callback provider mismatch', {
      state: query.state,
      provider: stateRecord.provider,
    })
    respondWithOAuthError(response, stateRecord.completionRedirectUrl, 'OAuth provider mismatch')
    return
  }

  const account = await createGithubAccountFromCallback(
    databaseClient,
    query.code,
    stateRecord.callbackUrl,
  )

  if (!account) {
    console.debug('Github OAuth callback failed to create account')
    respondWithOAuthError(response, stateRecord.completionRedirectUrl, 'Failed to connect Github account')
    return
  }

  const completionRedirectUrl = buildCompletionRedirectUrl(stateRecord.completionRedirectUrl, {
    provider: 'GITHUB',
    status: 'success',
    accountId: account.id,
  })

  if (completionRedirectUrl) {
    response.redirect(completionRedirectUrl)
    return
  }

  response.status(200).json({
    provider: 'GITHUB',
    accountId: account.id,
    status: 'success',
  })
}
