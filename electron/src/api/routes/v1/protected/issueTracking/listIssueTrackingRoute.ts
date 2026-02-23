// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@prisma/client'
import type { Request, Response } from 'express'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { sanitizeIssueTracking } from './utils'

type ListIssueTrackingResponse = {
  issueTracking: IssueTracking[]
}

export async function handleListIssueTrackingRequest(
  request: Request,
  response: Response<ListIssueTrackingResponse>,
): Promise<void> {
  void request

  const databaseClient = requireDatabaseClient('List issue tracking')
  let issueTracking: IssueTracking[] = []

  try {
    const accountRecords = await databaseClient.issueTracking.findMany({
      orderBy: { createdAt: 'desc' },
    })

    issueTracking = accountRecords.map(function mapIssueTracking(account) {
      return sanitizeIssueTracking(account)
    })
  }
  catch (error) {
    console.error('Failed to list issue tracking', error)
    if (!response.headersSent) {
      response.status(500).json({
        issueTracking: [],
      })
    }
    return
  }

  response.status(200).json({ issueTracking })
}
