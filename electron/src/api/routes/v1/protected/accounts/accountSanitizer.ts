// Copyright © 2026 Jalapeno Labs

import type { AuthAccount, AuthProvider } from '@prisma/client'

// Utility
import { maskToken } from '@common/maskToken'

export type AccountSummary = {
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

export function sanitizeAccount(account: AuthAccount): AccountSummary {
  return {
    id: account.id,
    provider: account.provider,
    name: account.name,
    username: account.username,
    email: account.email,
    tokenPreview: maskToken(account.accessToken),
    scope: account.scope,
    lastUsedAt: account.lastUsedAt,
    createdAt: account.createdAt,
  }
}
