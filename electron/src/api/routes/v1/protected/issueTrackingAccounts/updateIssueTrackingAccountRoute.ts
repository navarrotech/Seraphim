// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { UpdateIssueTrackingAccountRequest } from '@common/schema/issueTrackingAccounts'

// Core
import { parseRequestBody, parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { z } from 'zod'

// Schema
import { updateIssueTrackingAccountSchema } from '@common/schema/issueTrackingAccounts'
import { sanitizeIssueTrackingAccount } from './utils'

const updateIssueTrackingAccountParamsSchema = z.object({
  issueTrackingAccountId: z.string().trim().uuid(),
})

type UpdateIssueTrackingAccountRouteParams = z.infer<typeof updateIssueTrackingAccountParamsSchema>

export async function handleUpdateIssueTrackingAccountRequest(
  request: Request<
    UpdateIssueTrackingAccountRouteParams,
    unknown,
    UpdateIssueTrackingAccountRequest
  >,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    updateIssueTrackingAccountParamsSchema,
    request,
    response,
    {
      context: 'Update issue tracking account',
      errorMessage: 'Invalid issue tracking account identifier',
    },
  )

  if (!params) {
    console.debug('Update issue tracking account failed route param validation')
    return
  }

  const payload = parseRequestBody(
    updateIssueTrackingAccountSchema,
    request,
    response,
    {
      context: 'Update issue tracking account',
      errorMessage: 'Invalid issue tracking account update request body',
    },
  )

  if (!payload) {
    console.debug('Update issue tracking account failed body validation')
    return
  }

  const databaseClient = requireDatabaseClient('Update issue tracking account')

  const existingAccount = await databaseClient.issueTrackingAccount.findUnique({
    where: {
      id: params.issueTrackingAccountId,
    },
  })

  if (!existingAccount) {
    console.debug('Update issue tracking account failed because account was not found', {
      issueTrackingAccountId: params.issueTrackingAccountId,
    })
    response.status(404).json({
      error: 'Issue tracking account not found',
    })
    return
  }

  const nextName = payload.name ?? existingAccount.name
  const nextEmail = payload.email ?? existingAccount.email
  const nextBaseUrl = payload.baseUrl ?? existingAccount.baseUrl
  const nextAccessToken = payload.accessToken ?? existingAccount.accessToken
  const nextLastUsedAt = payload.accessToken
    ? new Date()
    : existingAccount.lastUsedAt

  const account = await databaseClient.issueTrackingAccount.update({
    where: {
      id: existingAccount.id,
    },
    data: {
      name: nextName,
      email: nextEmail,
      baseUrl: nextBaseUrl,
      accessToken: nextAccessToken,
      lastUsedAt: nextLastUsedAt,
    },
  })

  const sanitized = sanitizeIssueTrackingAccount(account)

  broadcastSseChange({
    type: 'update',
    kind: 'issueTrackingAccounts',
    data: sanitized,
  })

  response.status(200).json({
    account: sanitized,
  })
}
