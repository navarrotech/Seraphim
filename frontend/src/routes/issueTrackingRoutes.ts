// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@common/types'
import type {
  CreateIssueTrackingRequest,
  UpdateIssueTrackingRequest,
} from '@common/schema/issueTracking'

// Core
import { parseRequestBeforeSend } from '@common/api'
import { frontendClient } from '@frontend/framework/api'

// Redux
import { issueTrackingActions } from '@frontend/framework/redux/stores/issueTracking'
import { dispatch } from '@frontend/framework/store'

// Schema
import {
  createIssueTrackingSchema,
  updateIssueTrackingSchema,
} from '@common/schema/issueTracking'

// /////////////////////////////// //
//     List Issue Tracking Accounts //
// /////////////////////////////// //

type ListIssueTrackingResponse = {
  issueTracking: IssueTracking[]
}

// This route intentionally has no pagination
export async function listIssueTracking(): Promise<ListIssueTrackingResponse> {
  const response = await frontendClient
    .get('v1/protected/issue-tracking')
    .json<ListIssueTrackingResponse>()

  dispatch(
    issueTrackingActions.setIssueTracking(response.issueTracking),
  )

  return response
}

// /////////////////////////////// //
//      Create Issue Tracking       //
// /////////////////////////////// //

type CreateIssueTrackingResponse = {
  issueTracking: IssueTracking
}

export async function createIssueTracking(raw: CreateIssueTrackingRequest) {
  const json = parseRequestBeforeSend(createIssueTrackingSchema, raw)

  const response = await frontendClient
    .post('v1/protected/issue-tracking', { json })
    .json<CreateIssueTrackingResponse>()

  dispatch(
    issueTrackingActions.upsertIssueTracking(response.issueTracking),
  )

  return response
}

// /////////////////////////////// //
//      Update Issue Tracking       //
// /////////////////////////////// //

type UpdateIssueTrackingResponse = {
  issueTracking: IssueTracking
}

export async function updateIssueTracking(
  issueTrackingId: string,
  raw: UpdateIssueTrackingRequest,
) {
  const json = parseRequestBeforeSend(updateIssueTrackingSchema, raw)

  const response = await frontendClient
    .patch(
      `v1/protected/issue-tracking/${issueTrackingId}`,
      { json },
    )
    .json<UpdateIssueTrackingResponse>()

  dispatch(
    issueTrackingActions.upsertIssueTracking(response.issueTracking),
  )

  return response
}

// /////////////////////////////// //
//      Delete Issue Tracking       //
// /////////////////////////////// //

type DeleteIssueTrackingResponse = {
  issueTrackingId: string
  deleted: boolean
}

export async function deleteIssueTracking(issueTracking: IssueTracking) {
  const response = await frontendClient
    .delete(`v1/protected/issue-tracking/${issueTracking.id}`)
    .json<DeleteIssueTrackingResponse>()

  dispatch(
    issueTrackingActions.removeIssueTracking(issueTracking),
  )

  return response
}
