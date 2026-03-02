// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
// Lib
import { z } from 'zod'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { parseRequestBody } from '../../validation'
import { accountSchema } from '@common/schema/accounts'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'

const removeAccountSchema = z.object({
  gitAccount: accountSchema,
})
type RemoveAccountPayload = z.infer<typeof removeAccountSchema>

export async function handleRemoveAccountRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const payload = parseRequestBody<RemoveAccountPayload>(
    removeAccountSchema,
    request,
    response,
    {
      context: 'Remove token account',
      errorMessage: 'Invalid remove request',
    },
  )

  if (!payload) {
    console.debug('Remove token account request failed validation')
    return
  }

  const { gitAccount } = payload

  const databaseClient = requireDatabaseClient('Remove token account')

  const account = await databaseClient.gitAccount.findUnique({
    where: { id: gitAccount.id },
  })

  if (!account) {
    console.debug('Remove requested for unknown account', { accountId: gitAccount.id })
    response.status(404).json({ error: 'Account not found' })
    return
  }

  if (account.provider !== gitAccount.provider) {
    console.debug('Remove requested with provider mismatch', {
      accountId: gitAccount.id,
      provider: gitAccount.provider,
      accountProvider: account.provider,
    })
    response.status(400).json({ error: 'Account provider mismatch' })
    return
  }

  try {
    await databaseClient.gitAccount.delete({
      where: { id: account.id },
    })
  }
  catch (error) {
    console.error('Failed to delete token account', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to remove account' })
    }
    return
  }

  broadcastSseChange({
    type: 'delete',
    kind: 'gitAccounts',
    data: account,
  })

  response.status(200).json({
    provider: gitAccount.provider,
    accountId: gitAccount.id,
    revoked: true,
  })
}
