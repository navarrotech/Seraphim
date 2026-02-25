// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleListAccountsRequest } from './accounts/listAccountsRoute'
import { handleListBranchesRequest } from './accounts/listBranchesRoute'
import { handleListReposRequest } from './accounts/listReposRoute'
import { handleRemoveAccountRequest } from './accounts/removeAccountRoute'
import { handleUpsertAccountRequest } from './accounts/upsertAccountRoute'

export function createAccountsRouter(): Router {
  const accountsRouter = createRouter()

  // /api/v1/protected/accounts
  accountsRouter.get('/', handleListAccountsRequest)

  // /api/v1/protected/accounts/upsert
  accountsRouter.post('/upsert', handleUpsertAccountRequest)
  accountsRouter.post('/upsert/:accountId', handleUpsertAccountRequest)

  // /api/v1/protected/accounts/
  accountsRouter.delete('/', handleRemoveAccountRequest)

  // /api/v1/protected/accounts/branches
  accountsRouter.get('/branches', handleListBranchesRequest)

  // /api/v1/protected/accounts/repos
  accountsRouter.get('/repos', handleListReposRequest)

  // /api/v1/protected/accounts/repos/:githubUsername
  accountsRouter.get('/repos/:githubUsername', handleListReposRequest)

  return accountsRouter
}
