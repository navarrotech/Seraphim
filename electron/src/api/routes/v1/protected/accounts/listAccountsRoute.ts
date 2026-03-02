// Copyright © 2026 Jalapeno Labs

import type { GitAccount } from '@prisma/client'
import type { Request, Response } from 'express'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { sanitizeAccount } from './utils.ts'

type ListGitAccountsResponse = {
  gitAccounts: GitAccount[]
}

export async function handleListGitAccountsRequest(
  request: Request,
  response: Response<ListGitAccountsResponse>,
): Promise<void> {
  void request

  const databaseClient = requireDatabaseClient('List git accounts')

  let gitAccounts: GitAccount[] = []

  try {
    const accountRecords = await databaseClient.gitAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    gitAccounts = accountRecords.map(function mapAccount(account) {
      return sanitizeAccount(account)
    })
  }
  catch (error) {
    console.error('Failed to list git accounts', error)
    if (!response.headersSent) {
      response.status(500).json({
        gitAccounts: [],
      })
    }
    return
  }

  response.status(200).json({ gitAccounts })
}
