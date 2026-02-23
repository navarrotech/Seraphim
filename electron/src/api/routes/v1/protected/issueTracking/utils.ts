// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@common/types'

// Utility
import { maskToken } from '@common/maskToken'

export function sanitizeIssueTracking(account: IssueTracking) {
  return {
    ...account,
    accessToken: maskToken(account.accessToken),
  } as const
}
