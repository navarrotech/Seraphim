// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { AddAccountRequest } from '@common/schema/accounts'

// Core
import { parseRequestBody } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

// Schema
import { addAccountSchema } from '@common/schema/accounts'
import { sanitizeAccount } from './utils.ts'
import { validateGithubToken } from '@electron/api/oauth/githubTokenService'

export async function handleAddAccountRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const payload = parseRequestBody<AddAccountRequest>(
    addAccountSchema,
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

  const sanitized = sanitizeAccount(account)

  broadcastSseChange({
    type: 'create',
    kind: 'accounts',
    data: sanitized,
  })

  response.status(200).json({
    account: sanitized,
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
