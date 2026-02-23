// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@prisma/client'
import type { Request, Response } from 'express'
import type { CreateIssueTrackingRequest } from '@common/schema/issueTracking'

// Core
import { parseRequestBody } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { getIssueTracker } from '@common/issueTracking/getIssueTracker'

// Schema
import { createIssueTrackingSchema } from '@common/schema/issueTracking'

// Utility
import { resolveIssueTrackingBaseUrl } from '@common/issueTracking/utils'
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

  const resolvedBaseUrl = resolveIssueTrackingBaseUrl(payload.baseUrl)

  const tracker = getIssueTracker({
    id: 'draft',
    provider: payload.provider,
    baseUrl: resolvedBaseUrl,
    email: payload.email,
    accessToken: payload.accessToken,
    targetBoard: payload.targetBoard,
  } as IssueTracking)

  let isValid = false
  let errorMessage = ''

  try {
    const [ success, error ] = await tracker.check()
    isValid = success
    errorMessage = error
  }
  catch (error) {
    console.error('Issue tracking validation failed during create', error)
    response.status(500).json({
      error: 'Issue tracking validation failed',
    })
    return
  }

  if (!isValid) {
    console.debug('Issue tracking validation failed during create', {
      provider: payload.provider,
      baseUrl: resolvedBaseUrl,
      targetBoard: payload.targetBoard,
      errorMessage,
    })
    response.status(400).json({
      error: errorMessage || 'Issue tracking credentials are invalid',
    })
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
      baseUrl: resolvedBaseUrl,
      email: payload.email,
      accessToken: payload.accessToken,
      targetBoard: payload.targetBoard,
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
