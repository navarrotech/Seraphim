// Copyright © 2026 Jalapeno Labs

import type { IssueTrackingAccount } from '@prisma/client'
import type { Request, Response } from 'express'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { sanitizeIssueTrackingAccount } from './utils'

type ListIssueTrackingAccountsResponse = {
  accounts: IssueTrackingAccount[]
}

export async function handleListIssueTrackingAccountsRequest(
  request: Request,
  response: Response<ListIssueTrackingAccountsResponse>,
): Promise<void> {
  void request

  const databaseClient = requireDatabaseClient('List issue tracking accounts')
  let accounts: IssueTrackingAccount[] = []

  try {
    const accountRecords = await databaseClient.issueTrackingAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    accounts = accountRecords.map(function mapAccount(account) {
      return sanitizeIssueTrackingAccount(account)
    })
  }
  catch (error) {
    console.error('Failed to list issue tracking accounts', error)
    if (!response.headersSent) {
      response.status(500).json({
        accounts: [],
      })
    }
    return
  }

  response.status(200).json({ accounts })
}
