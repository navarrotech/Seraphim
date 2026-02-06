// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

import type { AccountSummary } from './accountSanitizer'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { sanitizeAccount } from './accountSanitizer'

type ListAccountsResponse = {
  accounts: AccountSummary[]
}

export async function handleListAccountsRequest(
  request: Request,
  response: Response<ListAccountsResponse>,
): Promise<void> {
  void request

  const databaseClient = requireDatabaseClient('List token accounts')

  let accounts: AccountSummary[] = []

  try {
    const accountRecords = await databaseClient.authAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    accounts = accountRecords.map(function mapAccount(account) {
      return sanitizeAccount(account)
    })
  }
  catch (error) {
    console.error('Failed to list token accounts', error)
    response.status(500).json({ accounts: [] })
    return
  }

  response.status(200).json({ accounts })
}
