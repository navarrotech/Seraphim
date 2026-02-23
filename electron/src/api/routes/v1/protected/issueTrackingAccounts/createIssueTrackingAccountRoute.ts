// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { CreateIssueTrackingAccountRequest } from '@common/schema/issueTrackingAccounts'

// Core
import { parseRequestBody } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

// Schema
import { createIssueTrackingAccountSchema } from '@common/schema/issueTrackingAccounts'
import { sanitizeIssueTrackingAccount } from './utils'

export async function handleCreateIssueTrackingAccountRequest(
  request: Request<
    Record<string, never>,
    unknown,
    CreateIssueTrackingAccountRequest
  >,
  response: Response,
): Promise<void> {
  const payload = parseRequestBody(
    createIssueTrackingAccountSchema,
    request,
    response,
    {
      context: 'Create issue tracking account',
      errorMessage: 'Invalid issue tracking account request',
    },
  )

  if (!payload) {
    console.debug('Create issue tracking account request failed validation')
    return
  }

  const databaseClient = requireDatabaseClient('Create issue tracking account')

  const user = await databaseClient.user.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (!user) {
    console.debug('Issue tracking account create requested but no users exist')
    response.status(404).json({ error: 'User not found' })
    return
  }

  const account = await databaseClient.issueTrackingAccount.create({
    data: {
      userId: user.id,
      provider: payload.provider,
      name: payload.name,
      baseUrl: payload.baseUrl,
      email: payload.email,
      accessToken: payload.accessToken,
    },
  })

  const sanitized = sanitizeIssueTrackingAccount(account)

  broadcastSseChange({
    type: 'create',
    kind: 'issueTrackingAccounts',
    data: sanitized,
  })

  response.status(201).json({
    account: sanitized,
  })
}
