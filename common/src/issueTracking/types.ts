// Copyright © 2026 Jalapeno Labs
export type IssueTrackingListIssuesParams = {
  search?: string
  page?: number
  limit?: number
}

export type IssueTrackingIssue = {
  id: string
  key: string
  summary: string
  statusId: string
  labels: string[]
}

export type IssueTrackingIssueList = {
  items: IssueTrackingIssue[]
  page: number
  limit: number
  totalCount: number
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
