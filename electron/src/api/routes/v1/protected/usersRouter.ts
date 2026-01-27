// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleGetCurrentUserRequest } from './users/getCurrentUserRoute'
import { handleUpdateUserSettingsRequest } from './users/updateUserSettingsRoute'

export function createUsersRouter(): Router {
  const usersRouter = createRouter()

  // /api/v1/protected/users/me
  usersRouter.get('/me', handleGetCurrentUserRequest)

  // /api/v1/protected/users/me/settings
  usersRouter.patch('/me/settings', handleUpdateUserSettingsRequest)

  return usersRouter
}

