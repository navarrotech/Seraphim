// Copyright © 2026 Jalapeno Labs

import type { AuthAccount } from '@prisma/client'
import type { Request, Response } from 'express'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { sanitizeAccount } from './utils.ts'

type ListAccountsResponse = {
  accounts: AuthAccount[]
}

export async function handleListAccountsRequest(
  request: Request,
  response: Response<ListAccountsResponse>,
): Promise<void> {
  void request

  const databaseClient = requireDatabaseClient('List token accounts')

  let accounts: AuthAccount[] = []

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
    if (!response.headersSent) {
      response.status(500).json({
        accounts: [],
      })
    }
    return
  }

  response.status(200).json({ accounts })
}
