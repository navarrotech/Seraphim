// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleAddAccountRequest } from './addAccountRoute'
import { handleListAccountsRequest } from './listAccountsRoute'
import { handleListReposRequest } from './listReposRoute'
import { handleLogoutAccountRequest } from './logoutAccountRoute'
import { handleUpdateAccountRequest } from './updateAccountRoute'

export function createAccountsRouter(): Router {
  const accountsRouter = createRouter()

  // /api/v1/protected/accounts
  accountsRouter.get('/', handleListAccountsRequest)

  // /api/v1/protected/accounts/add
  accountsRouter.post('/add', handleAddAccountRequest)

  // /api/v1/protected/accounts/logout
  accountsRouter.post('/logout', handleLogoutAccountRequest)

  // /api/v1/protected/accounts/:accountId
  accountsRouter.patch('/:accountId', handleUpdateAccountRequest)

  // /api/v1/protected/accounts/repos
  accountsRouter.get('/repos', handleListReposRequest)

  // /api/v1/protected/accounts/repos/:githubUsername
  accountsRouter.get('/repos/:githubUsername', handleListReposRequest)

  return accountsRouter
}
