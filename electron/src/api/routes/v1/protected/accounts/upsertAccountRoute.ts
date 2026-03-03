// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { GitAccount } from '@prisma/client'
import type { UpsertAccountRequest } from '@common/schema/accounts'

// Core
import { parseRequestBody, parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { createGitClient } from '@common/git/createGitClient'
import { z } from 'zod'

// Schema
import { upsertAccountSchema } from '@common/schema/accounts'
import { sanitizeAccount } from './utils.ts'

const upsertAccountParamsSchema = z.object({
  accountId: z.string().trim().uuid().optional(),
})
type UpsertAccountRouteParams = z.infer<typeof upsertAccountParamsSchema>

export async function handleUpsertAccountRequest(
  request: Request<UpsertAccountRouteParams, unknown, UpsertAccountRequest>,
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
  const { accountId } = params

  const payload = parseRequestBody<UpsertAccountRequest>(
    upsertAccountSchema,
    request,
    response,
    accountId
    ? {
        context: 'Update connected account',
        errorMessage: 'Invalid account update request body',
      }
    : {
        context: 'Add token account',
        errorMessage: 'Invalid account request',
      },
  )
  if (!payload) {
    console.debug('Upsert account request failed validation for body payload')
    return
  }

  const prisma = requireDatabaseClient('Upsert git account')

  let existingAccount: GitAccount | null = null
  if (accountId) {
    existingAccount = await prisma.gitAccount.findUnique({
      where: {
        id: accountId,
      },
    })

    if (!existingAccount) {
      console.debug('Update account failed because account was not found', {
        accountId,
      })
      response.status(400).json({
        error: 'Account to update not found',
      })
      return
    }
  }

  // Must always validate on every run, otherwise upsert will fail
  // Prisma upsert requires scope to always exist
  const gitClient = createGitClient(payload.accessToken || existingAccount?.accessToken)
  const validation = await gitClient.validateToken()

  if (validation.isValid === false) {
    response.status(400).json({
      error: validation.message,
      grantedScopes: validation.scopes,
      acceptedScopes: validation.acceptedScopes,
      missingScopes: validation.missingScopes,
    })
    return
  }

  if (validation.username !== payload.gitUserName) {
    console.debug('Update account failed because token username changed', {
      accountId,
      payloadUsername: payload.gitUserName,
      validationUsername: validation.username,
    })
    response.status(400).json({
      error: 'Token does not belong to this connected account username',
    })
    return
  }

  if (validation.emails.includes(payload.gitUserEmail) === false) {
    console.debug('Update account failed because token email changed', {
      accountId,
      payloadEmail: payload.gitUserEmail,
      validationEmails: validation.emails,
    })
    response.status(400).json({
      error: 'Token does not belong to this connected account email',
    })
    return
  }

  const account = await prisma.gitAccount.upsert({
    where: {
      id: accountId || 'foobar',
    },
    create: {
      provider: payload.provider,
      name: payload.name,
      accessToken: payload.accessToken,
      scope: validation.scopes,
      username: validation.username,
      email: payload.gitUserEmail,
      lastUsedAt: new Date(),
    },
    update: {
      name: payload.name,
      accessToken: payload.accessToken || existingAccount.accessToken,
      scope: validation.scopes,
      email: payload.gitUserEmail,
      lastUsedAt: new Date(),
    },
  })

  const sanitized = sanitizeAccount(account)

  if (accountId) {
    broadcastSseChange({
      type: 'update',
      kind: 'gitAccounts',
      data: sanitized,
    })

    response.status(200)
  }
  else {
    broadcastSseChange({
      type: 'create',
      kind: 'gitAccounts',
      data: sanitized,
    })

    response.status(201)
  }

  response.json({
    account: sanitized,
    type: validation.type,
    gitUserName: payload.gitUserName,
    gitUserEmail: payload.gitUserEmail,
    githubIdentity: {
      username: validation.username,
      email: validation.emails,
    },
    grantedScopes: validation.scopes,
    acceptedScopes: validation.acceptedScopes,
  })
}
