// Copyright © 2026 Jalapeno Labs

import type { NextFunction, Request, Response } from 'express'

export function errorMiddleware(
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  console.error('API error handler caught an error', {
    error,
    method: request.method,
    path: request.originalUrl,
  })

  if (response.headersSent) {
    console.debug('Response headers already sent, delegating error handling')
    next(error)
    return
  }

  response.status(500).json({
    message: 'Internal Server Error',
  })
}
