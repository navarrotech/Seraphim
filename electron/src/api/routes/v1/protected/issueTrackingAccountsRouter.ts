// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleCreateIssueTrackingAccountRequest } from './issueTrackingAccounts/createIssueTrackingAccountRoute'
import { handleDeleteIssueTrackingAccountRequest } from './issueTrackingAccounts/deleteIssueTrackingAccountRoute'
import { handleUpdateIssueTrackingAccountRequest } from './issueTrackingAccounts/updateIssueTrackingAccountRoute'

export function createIssueTrackingAccountsRouter(): Router {
  const issueTrackingAccountsRouter = createRouter()

  // /api/v1/protected/issue-tracking-accounts
  issueTrackingAccountsRouter.post(
    '/',
    handleCreateIssueTrackingAccountRequest,
  )

  // /api/v1/protected/issue-tracking-accounts/:issueTrackingAccountId
  issueTrackingAccountsRouter.patch(
    '/:issueTrackingAccountId',
    handleUpdateIssueTrackingAccountRequest,
  )

  // /api/v1/protected/issue-tracking-accounts/:issueTrackingAccountId
  issueTrackingAccountsRouter.delete(
    '/:issueTrackingAccountId',
    handleDeleteIssueTrackingAccountRequest,
  )

  return issueTrackingAccountsRouter
}
