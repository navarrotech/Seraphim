// Copyright © 2026 Jalapeno Labs

import type { NextFunction, Request, Response } from 'express'

export function protectedApiMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  console.debug('Protected API middleware invoked', {
    method: request.method,
    path: request.originalUrl,
  })

  next()
}
