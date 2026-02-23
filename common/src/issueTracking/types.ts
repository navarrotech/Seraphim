// Copyright © 2026 Jalapeno Labs

import type { StandardPaginatedResponseData, StandardUrlParams } from '@common/types'

export type IssueTrackingListIssuesParams = StandardUrlParams

export type IssueTrackingIssue = {
  id: string
  key: string
  summary: string
  statusId: string
  labels: string[]
}

export type IssueTrackingIssueList = StandardPaginatedResponseData & {
  items: IssueTrackingIssue[]
}

export type IssueTrackingLabel = {
  id: string
  name: string
}

export type IssueTrackingStatusType = {
  id: string
  name: string
  category?: string
}

export type IssueTrackingIssueUpdate = Partial<{
  summary: string
  description: string
  statusId: string
  labels: string[]
  assigneeId: string | null
}>
