// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

export function notFoundMiddleware(request: Request, response: Response): void {
  console.warn('API route not found', {
    method: request.method,
    path: request.originalUrl,
  })

  response.status(404).json({
    message: 'Not Found',
  })
}
