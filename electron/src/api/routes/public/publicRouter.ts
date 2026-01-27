// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleGithubCallbackRequest } from './oauth/githubCallbackRoute'
import { handleGetRootRequest } from './getRootRoute'
import { handleGetPingRequest } from './getPingRoute'
import { handleGetEventsRequest } from './getEventsRoute'

export function createPublicRouter(): Router {
  const publicRouter = createRouter()

  publicRouter.get('/', handleGetRootRequest)
  publicRouter.get('/ping', handleGetPingRequest)
  publicRouter.get('/events', handleGetEventsRequest)
  publicRouter.get('/api/v1/oauth/github/callback', handleGithubCallbackRequest)

  return publicRouter
}
