// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { CreateIssueTrackingRequest } from '@common/schema/issueTracking'

// Core
import { parseRequestBody } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

// Schema
import { createIssueTrackingSchema } from '@common/schema/issueTracking'
import { sanitizeIssueTracking } from './utils'

export async function handleCreateIssueTrackingRequest(
  request: Request<
    Record<string, never>,
    unknown,
    CreateIssueTrackingRequest
  >,
  response: Response,
): Promise<void> {
  const payload = parseRequestBody(
    createIssueTrackingSchema,
    request,
    response,
    {
      context: 'Create issue tracking',
      errorMessage: 'Invalid issue tracking request',
    },
  )

  if (!payload) {
    console.debug('Create issue tracking request failed validation')
    return
  }

  const databaseClient = requireDatabaseClient('Create issue tracking')

  const user = await databaseClient.user.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (!user) {
    console.debug('Issue tracking create requested but no users exist')
    response.status(404).json({ error: 'User not found' })
    return
  }

  const account = await databaseClient.issueTracking.create({
    data: {
      userId: user.id,
      provider: payload.provider,
      name: payload.name,
      baseUrl: payload.baseUrl,
      email: payload.email,
      accessToken: payload.accessToken,
    },
  })

  const sanitized = sanitizeIssueTracking(account)

  broadcastSseChange({
    type: 'create',
    kind: 'issueTracking',
    data: sanitized,
  })

  response.status(201).json({
    issueTracking: sanitized,
  })
}
