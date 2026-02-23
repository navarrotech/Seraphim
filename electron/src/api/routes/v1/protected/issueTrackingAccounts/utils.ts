// Copyright © 2026 Jalapeno Labs

import type { IssueTrackingAccount } from '@common/types'

// Utility
import { maskToken } from '@common/maskToken'

export function sanitizeIssueTrackingAccount(account: IssueTrackingAccount) {
  return {
    ...account,
    accessToken: maskToken(account.accessToken),
  } as const
}
