// Copyright © 2026 Jalapeno Labs

import type { GitAccount } from '@prisma/client'

// Utility
import { maskToken } from '@common/maskToken'

export function sanitizeAccount(account: GitAccount): GitAccount {
  return {
    id: account.id,
    provider: account.provider,
    name: account.name,
    username: account.username,
    email: account.email,
    accessToken: maskToken(account.accessToken),
    scope: account.scope,
    lastUsedAt: account.lastUsedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}
