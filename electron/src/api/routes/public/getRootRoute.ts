// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

export function handleGetRootRequest(request: Request, response: Response): void {
  response.status(200).send('ok')
}
