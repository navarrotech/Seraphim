// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
// Lib
import { z } from 'zod'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { revokeGithubAuthorization } from '@electron/api/oauth/githubOAuthService'
import { parseRequestBody } from '../../validation'

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
      context: 'Logout OAuth account',
      errorMessage: 'Invalid logout request',
    },
  )

  if (!payload) {
    console.debug('Logout OAuth account request failed validation')
    return
  }

  const databaseClient = requireDatabaseClient('Logout OAuth account')

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

  let revokeSucceeded = false
  if (payload.provider === 'GITHUB') {
    revokeSucceeded = await revokeGithubAuthorization(account.accessToken)
  }

  if (!revokeSucceeded) {
    console.debug('OAuth token revocation failed, proceeding with local logout', {
      accountId: account.id,
    })
  }

  try {
    await databaseClient.authAccount.delete({
      where: { id: account.id },
    })
  }
  catch (error) {
    console.error('Failed to delete OAuth account', error)
    response.status(500).json({ error: 'Failed to remove account' })
    return
  }

  response.status(200).json({
    provider: payload.provider,
    accountId: payload.accountId,
    revoked: revokeSucceeded,
  })
}
