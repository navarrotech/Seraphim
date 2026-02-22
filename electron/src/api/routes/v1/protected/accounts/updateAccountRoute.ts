// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { UpdateAccountRequest } from '@common/schema/accounts'

// Core
import { parseRequestBody, parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { z } from 'zod'

// Schema
import { updateAccountSchema } from '@common/schema/accounts'
import { sanitizeAccount } from './utils.ts'
import { validateGithubToken } from '@electron/api/oauth/githubTokenService'


const updateAccountParamsSchema = z.object({
  accountId: z.string().trim().uuid(),
})

type UpdateAccountRouteParams = z.infer<typeof updateAccountParamsSchema>

export async function handleUpdateAccountRequest(
  request: Request<UpdateAccountRouteParams, unknown, UpdateAccountRequest>,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    updateAccountParamsSchema,
    request,
    response,
    {
      context: 'Update connected account',
      errorMessage: 'Invalid account identifier',
    },
  )
  if (!params) {
    console.debug('Update account request failed validation for route params')
    return
  }

  const payload = parseRequestBody(
    updateAccountSchema,
    request,
    response,
    {
      context: 'Update connected account',
      errorMessage: 'Invalid account update request body',
    },
  )
  if (!payload) {
    console.debug('Update account request failed validation for body payload')
    return
  }

  const prisma = requireDatabaseClient('Update connected account')

  const existingAccount = await prisma.authAccount.findUnique({
    where: {
      id: params.accountId,
    },
  })
  if (!existingAccount) {
    console.debug('Update account failed because account was not found', {
      accountId: params.accountId,
    })
    response.status(404).json({
      error: 'Account not found',
    })
    return
  }

  const nextName = payload.name ?? existingAccount.name
  const nextEmail = payload.gitUserEmail ?? existingAccount.email

  let nextScope = existingAccount.scope
  let nextAccessToken = existingAccount.accessToken
  let nextLastUsedAt = existingAccount.lastUsedAt

  if (payload.accessToken) {
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

    if (validation.username !== existingAccount.username) {
      console.debug('Update account failed because token username changed', {
        accountId: existingAccount.id,
        existingUsername: existingAccount.username,
        validationUsername: validation.username,
      })
      response.status(400).json({
        error: 'Token does not belong to this connected account username',
      })
      return
    }

    nextScope = validation.scope
    nextAccessToken = payload.accessToken
    nextLastUsedAt = new Date()
  }

  const account = await prisma.authAccount.update({
    where: {
      id: existingAccount.id,
    },
    data: {
      name: nextName,
      email: nextEmail,
      scope: nextScope,
      accessToken: nextAccessToken,
      lastUsedAt: nextLastUsedAt,
    },
  })

  const sanitized = sanitizeAccount(account)

  broadcastSseChange({
    type: 'update',
    kind: 'accounts',
    data: sanitized,
  })

  response.status(200).json({
    account: sanitized,
  })
}
