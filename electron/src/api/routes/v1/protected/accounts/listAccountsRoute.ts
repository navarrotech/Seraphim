// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { AuthProvider } from '@prisma/client'

// Utility
import { requireDatabaseClient } from '@electron/database'

type AccountSummary = {
  id: string
  provider: AuthProvider
  providerAccountId: string
  username: string
  displayName: string
  avatarUrl: string | null
  email: string | null
  lastUsedAt: Date | null
  createdAt: Date
}

type ListAccountsResponse = {
  accounts: AccountSummary[]
}

export async function handleListAccountsRequest(
  request: Request,
  response: Response<ListAccountsResponse>,
): Promise<void> {
  void request

  const databaseClient = requireDatabaseClient('List OAuth accounts')

  let accounts: AccountSummary[] = []

  try {
    const accountRecords = await databaseClient.authAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    accounts = accountRecords.map((account) => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      email: account.email,
      lastUsedAt: account.lastUsedAt,
      createdAt: account.createdAt,
    }))
  }
  catch (error) {
    console.error('Failed to list OAuth accounts', error)
    response.status(500).json({ accounts: []})
    return
  }

  response.status(200).json({ accounts })
}
