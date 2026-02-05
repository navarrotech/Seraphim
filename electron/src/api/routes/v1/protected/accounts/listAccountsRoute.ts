// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { AuthProvider } from '@prisma/client'

// Utility
import { maskToken } from '@common/maskToken'
import { requireDatabaseClient } from '@electron/database'

type AccountSummary = {
  id: string
  provider: AuthProvider
  name: string
  username: string
  email: string
  tokenPreview: string
  scope: string
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

  const databaseClient = requireDatabaseClient('List token accounts')

  let accounts: AccountSummary[] = []

  try {
    const accountRecords = await databaseClient.authAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    accounts = accountRecords.map((account) => ({
      id: account.id,
      provider: account.provider,
      name: account.name,
      username: account.username,
      email: account.email,
      tokenPreview: maskToken(account.accessToken, 6),
      scope: account.scope,
      lastUsedAt: account.lastUsedAt,
      createdAt: account.createdAt,
    }))
  }
  catch (error) {
    console.error('Failed to list token accounts', error)
    response.status(500).json({ accounts: [] })
    return
  }

  response.status(200).json({ accounts })
}
