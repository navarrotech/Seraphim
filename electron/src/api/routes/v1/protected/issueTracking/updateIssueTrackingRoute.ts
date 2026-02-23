// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { UpdateIssueTrackingRequest } from '@common/schema/issueTracking'

// Core
import { parseRequestBody, parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { z } from 'zod'

// Schema
import { updateIssueTrackingSchema } from '@common/schema/issueTracking'
import { sanitizeIssueTracking } from './utils'

const updateIssueTrackingParamsSchema = z.object({
  issueTrackingId: z.string().trim().uuid(),
})

type UpdateIssueTrackingRouteParams = z.infer<typeof updateIssueTrackingParamsSchema>

export async function handleUpdateIssueTrackingRequest(
  request: Request<
    UpdateIssueTrackingRouteParams,
    unknown,
    UpdateIssueTrackingRequest
  >,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    updateIssueTrackingParamsSchema,
    request,
    response,
    {
      context: 'Update issue tracking',
      errorMessage: 'Invalid issue tracking identifier',
    },
  )

  if (!params) {
    console.debug('Update issue tracking failed route param validation')
    return
  }

  const payload = parseRequestBody(
    updateIssueTrackingSchema,
    request,
    response,
    {
      context: 'Update issue tracking',
      errorMessage: 'Invalid issue tracking update request body',
    },
  )

  if (!payload) {
    console.debug('Update issue tracking failed body validation')
    return
  }

  const databaseClient = requireDatabaseClient('Update issue tracking')

  const existingIssueTracking = await databaseClient.issueTracking.findUnique({
    where: {
      id: params.issueTrackingId,
    },
  })

  if (!existingIssueTracking) {
    console.debug('Update issue tracking failed because record was not found', {
      issueTrackingId: params.issueTrackingId,
    })
    response.status(404).json({
      error: 'Issue tracking not found',
    })
    return
  }

  const nextName = payload.name ?? existingIssueTracking.name
  const nextEmail = payload.email ?? existingIssueTracking.email
  const nextBaseUrl = payload.baseUrl ?? existingIssueTracking.baseUrl
  const nextAccessToken = payload.accessToken ?? existingIssueTracking.accessToken
  const nextTargetBoard = payload.targetBoard ?? existingIssueTracking.targetBoard
  const nextLastUsedAt = payload.accessToken
    ? new Date()
    : existingIssueTracking.lastUsedAt

  const issueTracking = await databaseClient.issueTracking.update({
    where: {
      id: existingIssueTracking.id,
    },
    data: {
      name: nextName,
      email: nextEmail,
      baseUrl: nextBaseUrl,
      accessToken: nextAccessToken,
      targetBoard: nextTargetBoard,
      lastUsedAt: nextLastUsedAt,
    },
  })

  const sanitized = sanitizeIssueTracking(issueTracking)

  broadcastSseChange({
    type: 'update',
    kind: 'issueTracking',
    data: sanitized,
  })

  response.status(200).json({
    issueTracking: sanitized,
  })
}
