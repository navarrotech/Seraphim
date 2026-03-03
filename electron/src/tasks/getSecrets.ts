// Copyright © 2026 Jalapeno Labs

// Core
import { requireDatabaseClient } from '@electron/database'

// Misc
import { STANDARD_SECRET_WORDS } from '@common/constants'

export async function getSecrets(): Promise<string[]> {
  const prisma = requireDatabaseClient('getSecrets')

  const [ gitAccounts, llms ] = await Promise.all([
    prisma.gitAccount.findMany({
      select: {
        id: true,
        accessToken: true,
      },
    }),
    prisma.llm.findMany({
      select: {
        id: true,
        apiKey: true,
      },
    }),
  ])

  const secrets: string[] = [
    ...STANDARD_SECRET_WORDS,
  ]

  for (const gitAccount of gitAccounts) {
    if (gitAccount.accessToken) {
      secrets.push(gitAccount.accessToken)
    }
  }

  for (const llm of llms) {
    if (llm.apiKey) {
      secrets.push(llm.apiKey)
    }
  }

  return secrets
}
