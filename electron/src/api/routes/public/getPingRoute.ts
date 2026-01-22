// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

export function handleGetPingRequest(request: Request, response: Response): void {
  response.status(200).send('pong')
}
