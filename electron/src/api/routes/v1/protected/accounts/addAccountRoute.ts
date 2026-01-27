// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
// Lib
import { z } from 'zod'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { createGithubAuthorizationUrl } from '@electron/api/oauth/githubOAuthService'
import { parseRequestBody } from '../../validation'

const addAccountRequestSchema = z.object({
  provider: z.literal('GITHUB'),
  completionRedirectUrl: z.string().trim().url().optional(),
})
type AddAccountPayload = z.infer<typeof addAccountRequestSchema>

export async function handleAddAccountRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const payload = parseRequestBody<AddAccountPayload>(
    addAccountRequestSchema,
    request,
    response,
    {
      context: 'Add OAuth account',
      errorMessage: 'Invalid OAuth account request',
    },
  )

  if (!payload) {
    console.debug('Add OAuth account request failed validation')
    return
  }

  const databaseClient = requireDatabaseClient('Add OAuth account')

  if (payload.provider === 'GITHUB') {
    const authorizationResult = await createGithubAuthorizationUrl(databaseClient, {
      completionRedirectUrl: payload.completionRedirectUrl,
    })

    if (!authorizationResult) {
      console.debug('Failed to create Github OAuth authorization URL')
      response.status(500).json({ error: 'Failed to initiate OAuth flow' })
      return
    }

    response.status(200).json({
      provider: authorizationResult.provider,
      authorizationUrl: authorizationResult.authorizationUrl,
      state: authorizationResult.state,
      scopes: authorizationResult.scopes,
    })
    return
  }

  console.debug('Unsupported OAuth provider requested', { provider: payload.provider })
  response.status(400).json({ error: 'Unsupported OAuth provider' })
}
