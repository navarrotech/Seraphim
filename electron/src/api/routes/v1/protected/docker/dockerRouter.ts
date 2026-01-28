// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

// Misc
import { handleBuildDockerImageRequest } from './buildDockerImageRoute'
import { handleBuildEventsRequest } from './buildEventsRoute'

export function createDockerRouter(): Router {
  const dockerRouter = createRouter()

  // /api/v1/protected/docker/build
  dockerRouter.post('/build', handleBuildDockerImageRequest)

  // /api/v1/protected/docker/build/events
  dockerRouter.get('/build/events', handleBuildEventsRequest)

  return dockerRouter
}
