// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Core
import { parseRequestParams } from '../../validation'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { z } from 'zod'

// Schema
import { sanitizeIssueTracking } from './utils'

const deleteIssueTrackingParamsSchema = z.object({
  issueTrackingId: z.string().trim().uuid(),
})

type DeleteIssueTrackingRouteParams = z.infer<
  typeof deleteIssueTrackingParamsSchema
>

export async function handleDeleteIssueTrackingRequest(
  request: Request<DeleteIssueTrackingRouteParams>,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    deleteIssueTrackingParamsSchema,
    request,
    response,
    {
      context: 'Delete issue tracking',
      errorMessage: 'Invalid issue tracking identifier',
    },
  )

  if (!params) {
    console.debug('Delete issue tracking failed route param validation')
    return
  }

  const databaseClient = requireDatabaseClient('Delete issue tracking')

  const existingIssueTracking = await databaseClient.issueTracking.findUnique({
    where: {
      id: params.issueTrackingId,
    },
  })

  if (!existingIssueTracking) {
    console.debug('Delete issue tracking failed because record was not found', {
      issueTrackingId: params.issueTrackingId,
    })
    response.status(404).json({
      error: 'Issue tracking not found',
    })
    return
  }

  try {
    await databaseClient.issueTracking.delete({
      where: {
        id: existingIssueTracking.id,
      },
    })
  }
  catch (error) {
    console.error('Failed to delete issue tracking', error)
    if (!response.headersSent) {
      response.status(500).json({
        error: 'Failed to delete issue tracking',
      })
    }
    return
  }

  const sanitized = sanitizeIssueTracking(existingIssueTracking)

  broadcastSseChange({
    type: 'delete',
    kind: 'issueTracking',
    data: sanitized,
  })

  response.status(200).json({
    issueTrackingId: existingIssueTracking.id,
    deleted: true,
  })
}
