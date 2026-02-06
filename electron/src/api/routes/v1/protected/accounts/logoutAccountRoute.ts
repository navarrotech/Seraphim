// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
// Lib
import { z } from 'zod'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { parseRequestBody } from '../../validation'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'

const logoutAccountSchema = z.object({
  provider: z.literal('GITHUB'),
  accountId: z.string().trim().min(1),
})
type LogoutAccountPayload = z.infer<typeof logoutAccountSchema>

export async function handleLogoutAccountRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const payload = parseRequestBody<LogoutAccountPayload>(
    logoutAccountSchema,
    request,
    response,
    {
      context: 'Logout token account',
      errorMessage: 'Invalid logout request',
    },
  )

  if (!payload) {
    console.debug('Logout token account request failed validation')
    return
  }

  const databaseClient = requireDatabaseClient('Logout token account')

  const account = await databaseClient.authAccount.findUnique({
    where: { id: payload.accountId },
  })

  if (!account) {
    console.debug('Logout requested for unknown account', { accountId: payload.accountId })
    response.status(404).json({ error: 'Account not found' })
    return
  }

  if (account.provider !== payload.provider) {
    console.debug('Logout requested with provider mismatch', {
      accountId: payload.accountId,
      provider: payload.provider,
      accountProvider: account.provider,
    })
    response.status(400).json({ error: 'Account provider mismatch' })
    return
  }

  try {
    await databaseClient.authAccount.delete({
      where: { id: account.id },
    })
  }
  catch (error) {
    console.error('Failed to delete token account', error)
    response.status(500).json({ error: 'Failed to remove account' })
    return
  }

  broadcastSseChange({
    type: 'delete',
    kind: 'accounts',
    data: [ account ],
  })

  response.status(200).json({
    provider: payload.provider,
    accountId: payload.accountId,
    revoked: true,
  })
}
