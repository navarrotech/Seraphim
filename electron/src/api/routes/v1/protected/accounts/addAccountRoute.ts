// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

import type { AccountSummary } from './accountSanitizer'

// Lib
import { z } from 'zod'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { validateGithubToken } from '@electron/api/oauth/githubTokenService'
import { parseRequestBody } from '../../validation'
import { sanitizeAccount } from './accountSanitizer'

const addAccountRequestSchema = z.object({
  provider: z.literal('GITHUB'),
  name: z.string().trim().min(1),
  accessToken: z.string().trim().min(1),
  gitUserName: z.string().trim().min(1),
  gitUserEmail: z.string().trim().email(),
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
      context: 'Add token account',
      errorMessage: 'Invalid account request',
    },
  )

  if (!payload) {
    console.debug('Add account request failed validation')
    return
  }

  const validation = await validateGithubToken(payload.accessToken)
  if (validation.isValid === false) {
    response.status(400).json({
      error: validation.error,
      status: validation.status,
      grantedScopes: validation.grantedScopes,
      acceptedScopes: validation.acceptedScopes,
      missingScopes: validation.missingScopes,
    })
    return
  }

  const databaseClient = requireDatabaseClient('Add token account')

  const account = await databaseClient.authAccount.upsert({
    where: {
      provider_username: {
        provider: payload.provider,
        username: validation.username,
      },
    },
    create: {
      provider: payload.provider,
      name: payload.name,
      accessToken: payload.accessToken,
      scope: validation.scope,
      username: validation.username,
      email: payload.gitUserEmail,
    },
    update: {
      name: payload.name,
      accessToken: payload.accessToken,
      scope: validation.scope,
      email: payload.gitUserEmail,
      lastUsedAt: new Date(),
    },
  })

  const accountSummary: AccountSummary = sanitizeAccount(account)

  response.status(200).json({
    account: accountSummary,
    gitUserName: payload.gitUserName,
    gitUserEmail: payload.gitUserEmail,
    githubIdentity: {
      username: validation.username,
      email: validation.email,
    },
    grantedScopes: validation.grantedScopes,
    acceptedScopes: validation.acceptedScopes,
  })
}
