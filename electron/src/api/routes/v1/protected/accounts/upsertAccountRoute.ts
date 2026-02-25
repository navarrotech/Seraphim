// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { AddAccountRequest, UpdateAccountRequest } from '@common/schema/accounts'

// Core
import { parseRequestBody, parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { z } from 'zod'

// Schema
import { addAccountSchema, updateAccountSchema } from '@common/schema/accounts'
import { sanitizeAccount } from './utils.ts'
import { validateGithubToken } from '@electron/api/oauth/githubTokenService'

const upsertAccountParamsSchema = z.object({
  accountId: z.string().trim().uuid().optional(),
})

type UpsertAccountRouteParams = z.infer<typeof upsertAccountParamsSchema>
type UpsertAccountRequestBody = AddAccountRequest | UpdateAccountRequest

export async function handleUpsertAccountRequest(
  request: Request<UpsertAccountRouteParams, unknown, UpsertAccountRequestBody>,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    upsertAccountParamsSchema,
    request,
    response,
    {
      context: 'Upsert connected account',
      errorMessage: 'Invalid account identifier',
    },
  )
  if (!params) {
    console.debug('Upsert account request failed validation for route params')
    return
  }

  if (params.accountId) {
    await handleUpsertAccountUpdate(
      params.accountId,
      request,
      response,
    )
    return
  }

  await handleUpsertAccountCreate(
    request,
    response,
  )
}

async function handleUpsertAccountCreate(
  request: Request<UpsertAccountRouteParams, unknown, UpsertAccountRequestBody>,
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

  response.status(201).json({
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

async function handleUpsertAccountUpdate(
  accountId: string,
  request: Request<UpsertAccountRouteParams, unknown, UpsertAccountRequestBody>,
  response: Response,
): Promise<void> {
  const payload = parseRequestBody<UpdateAccountRequest>(
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
      id: accountId,
    },
  })
  if (!existingAccount) {
    console.debug('Update account failed because account was not found', {
      accountId,
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
