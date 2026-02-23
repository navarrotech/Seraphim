// Copyright © 2026 Jalapeno Labs

import type { IssueTrackingAccount } from '@common/types'
import type {
  CreateIssueTrackingAccountRequest,
  UpdateIssueTrackingAccountRequest,
} from '@common/schema/issueTrackingAccounts'

// Core
import { apiClient, parseRequestBeforeSend } from '@common/api'

// Redux
import { issueTrackingAccountActions } from '@frontend/framework/redux/stores/issueTrackingAccounts'
import { dispatch } from '@frontend/framework/store'

// Schema
import {
  createIssueTrackingAccountSchema,
  updateIssueTrackingAccountSchema,
} from '@common/schema/issueTrackingAccounts'

// /////////////////////////////// //
//     List Issue Tracking Accounts //
// /////////////////////////////// //

type ListIssueTrackingAccountsResponse = {
  accounts: IssueTrackingAccount[]
}

// This route intentionally has no pagination
export async function listIssueTrackingAccounts(): Promise<ListIssueTrackingAccountsResponse> {
  const response = await apiClient
    .get('v1/protected/issue-tracking-accounts')
    .json<ListIssueTrackingAccountsResponse>()

  dispatch(
    issueTrackingAccountActions.setIssueTrackingAccounts(response.accounts),
  )

  return response
}

// /////////////////////////////// //
//      Create Issue Tracking       //
// /////////////////////////////// //

type CreateIssueTrackingAccountResponse = {
  account: IssueTrackingAccount
}

export async function createIssueTrackingAccount(raw: CreateIssueTrackingAccountRequest) {
  const json = parseRequestBeforeSend(createIssueTrackingAccountSchema, raw)

  const response = await apiClient
    .post('v1/protected/issue-tracking-accounts', { json })
    .json<CreateIssueTrackingAccountResponse>()

  dispatch(
    issueTrackingAccountActions.upsertIssueTrackingAccount(response.account),
  )

  return response
}

// /////////////////////////////// //
//      Update Issue Tracking       //
// /////////////////////////////// //

type UpdateIssueTrackingAccountResponse = {
  account: IssueTrackingAccount
}

export async function updateIssueTrackingAccount(
  issueTrackingAccountId: string,
  raw: UpdateIssueTrackingAccountRequest,
) {
  const json = parseRequestBeforeSend(updateIssueTrackingAccountSchema, raw)

  const response = await apiClient
    .patch(
      `v1/protected/issue-tracking-accounts/${issueTrackingAccountId}`,
      { json },
    )
    .json<UpdateIssueTrackingAccountResponse>()

  dispatch(
    issueTrackingAccountActions.upsertIssueTrackingAccount(response.account),
  )

  return response
}

// /////////////////////////////// //
//      Delete Issue Tracking       //
// /////////////////////////////// //

type DeleteIssueTrackingAccountResponse = {
  accountId: string
  deleted: boolean
}

export async function deleteIssueTrackingAccount(account: IssueTrackingAccount) {
  const response = await apiClient
    .delete(`v1/protected/issue-tracking-accounts/${account.id}`)
    .json<DeleteIssueTrackingAccountResponse>()

  dispatch(
    issueTrackingAccountActions.removeIssueTrackingAccount(account),
  )

  return response
}
