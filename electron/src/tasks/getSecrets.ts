// Copyright © 2026 Jalapeno Labs

import { requireDatabaseClient } from '@electron/database'

export async function getSecrets(): Promise<string[]> {
  const prisma = requireDatabaseClient('getSecrets')

  const [ authAccounts, llms ] = await Promise.all([
    prisma.authAccount.findMany({
      select: {
        id: true,
        accessToken: true,
      },
    }),
    prisma.llm.findMany({
      select: {
        id: true,
        accessToken: true,
        apiKey: true,
      },
    }),
  ])

  const secrets = [
    'x-access-token', // GitHub Auth Provider token
  ]

  for (const authAccount of authAccounts) {
    if (authAccount.accessToken) {
      secrets.push(authAccount.accessToken)
    }
  }

  for (const llm of llms) {
    if (llm.accessToken) {
      secrets.push(llm.accessToken)
    }
    if (llm.apiKey) {
      secrets.push(llm.apiKey)
    }
  }

  return secrets
}
