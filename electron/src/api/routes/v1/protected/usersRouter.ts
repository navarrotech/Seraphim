// Copyright Ac 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleGetCurrentUserRequest } from './users/getCurrentUserRoute'

export function createUsersRouter(): Router {
  const usersRouter = createRouter()

  // /api/v1/protected/users/me
  usersRouter.get('/me', handleGetCurrentUserRequest)

  return usersRouter
}
