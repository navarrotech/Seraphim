// Copyright © 2026 Jalapeno Labs

// Core
import { requireDatabaseClient } from '@electron/database'

// Misc
import { STANDARD_SECRET_WORDS } from '@common/constants'

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

  const secrets: string[] = [
    ...STANDARD_SECRET_WORDS,
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
