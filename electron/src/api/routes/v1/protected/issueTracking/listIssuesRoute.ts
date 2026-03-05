// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { IssueTrackingSearchMode } from '@common/issueTracking/types'

// Core
import { getIssueTracker } from '@common/issueTracking/getIssueTracker'
import {
  listIssueTrackingIssuesParamsSchema,
  listIssueTrackingIssuesQuerySchema,
} from '@common/schema/issueTracking'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { parseRequestParams, parseRequestQuery } from '../../validation'
import { resolveSearchQuery } from '../../utils/searchQuery'

export async function handleListIssueTrackingIssuesRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const params = parseRequestParams(
    listIssueTrackingIssuesParamsSchema,
    request,
    response,
    {
      context: 'List issue tracking issues',
      errorMessage: 'Invalid issue tracking identifier',
    },
  )

  if (!params) {
    console.debug('List issue tracking issues failed params validation')
    return
  }

  const query = parseRequestQuery(
    listIssueTrackingIssuesQuerySchema,
    request,
    response,
    {
      context: 'List issue tracking issues',
      errorMessage: 'Invalid issue search query',
    },
  )

  if (!query) {
    console.debug('List issue tracking issues failed query validation')
    return
  }

  const page = query.page ?? 1
  const limit = query.limit ?? 20

  const databaseClient = requireDatabaseClient('List issue tracking issues')
  const issueTracking = await databaseClient.issueTracking.findUnique({
    where: {
      id: params.issueTrackingId,
    },
  })

  if (!issueTracking) {
    console.debug('List issue tracking issues could not find provider connection', {
      issueTrackingId: params.issueTrackingId,
    })
    response.status(404).json({ error: 'Issue tracking connection not found' })
    return
  }

  const issueTracker = getIssueTracker(issueTracking)
  const searchMode: IssueTrackingSearchMode = query.mode ?? 'text'
  const issueList = await issueTracker.listIssues({
    q: resolveSearchQuery(query),
    mode: searchMode,
    page,
    limit,
  })

  response.status(200).json({
    issueTrackingId: issueTracking.id,
    ...issueList,
  })
}
