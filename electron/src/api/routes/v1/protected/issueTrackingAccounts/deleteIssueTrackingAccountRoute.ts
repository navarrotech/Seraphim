// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Core
import { parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { z } from 'zod'

// Schema
import { sanitizeIssueTrackingAccount } from './utils'

const deleteIssueTrackingAccountParamsSchema = z.object({
  issueTrackingAccountId: z.string().trim().uuid(),
})

type DeleteIssueTrackingAccountRouteParams = z.infer<
  typeof deleteIssueTrackingAccountParamsSchema
>

export async function handleDeleteIssueTrackingAccountRequest(
  request: Request<DeleteIssueTrackingAccountRouteParams>,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    deleteIssueTrackingAccountParamsSchema,
    request,
    response,
    {
      context: 'Delete issue tracking account',
      errorMessage: 'Invalid issue tracking account identifier',
    },
  )

  if (!params) {
    console.debug('Delete issue tracking account failed route param validation')
    return
  }

  const databaseClient = requireDatabaseClient('Delete issue tracking account')

  const existingAccount = await databaseClient.issueTrackingAccount.findUnique({
    where: {
      id: params.issueTrackingAccountId,
    },
  })

  if (!existingAccount) {
    console.debug('Delete issue tracking account failed because account was not found', {
      issueTrackingAccountId: params.issueTrackingAccountId,
    })
    response.status(404).json({
      error: 'Issue tracking account not found',
    })
    return
  }

  try {
    await databaseClient.issueTrackingAccount.delete({
      where: {
        id: existingAccount.id,
      },
    })
  }
  catch (error) {
    console.error('Failed to delete issue tracking account', error)
    if (!response.headersSent) {
      response.status(500).json({
        error: 'Failed to delete issue tracking account',
      })
    }
    return
  }

  const sanitized = sanitizeIssueTrackingAccount(existingAccount)

  broadcastSseChange({
    type: 'delete',
    kind: 'issueTrackingAccounts',
    data: sanitized,
  })

  response.status(200).json({
    accountId: existingAccount.id,
    deleted: true,
  })
}
