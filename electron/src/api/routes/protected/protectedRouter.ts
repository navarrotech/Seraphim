// Copyright © 2026 Jalapeno Labs

import type { Router } from 'express'

// Core
import { Router as createRouter } from 'express'

export function createProtectedRouter(): Router {
  const protectedRouter = createRouter()

  return protectedRouter
}
