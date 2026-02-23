// Copyright © 2026 Jalapeno Labs

import type {
  IssueTrackingIssue,
  IssueTrackingIssueList,
  IssueTrackingIssueUpdate,
  IssueTrackingLabel,
  IssueTrackingListIssuesParams,
  IssueTrackingStatusType,
} from '../types'

// Core
import { IssueTracker } from './issueTracker'

export class JiraIssueTracker extends IssueTracker {
  public async check(): Promise<[ boolean, string ]> {
    console.debug('Jira issue tracking check not implemented', {
      issueTrackingId: this.issueTracking.id,
      baseUrl: this.issueTracking.baseUrl,
      targetBoard: this.issueTracking.targetBoard,
    })
    return [ false, 'Jira issue tracking check not implemented' ]
  }

  public async listIssues(
    params: IssueTrackingListIssuesParams = {},
  ): Promise<IssueTrackingIssueList> {
    console.debug('Jira listIssues not implemented', {
      issueTrackingId: this.issueTracking.id,
      search: params.q ?? null,
      page: params.page ?? null,
      limit: params.limit ?? null,
    })
    return super.listIssues(params)
  }

  public async getIssueById(issueId: string): Promise<IssueTrackingIssue | null> {
    console.debug('Jira getIssueById not implemented', {
      issueTrackingId: this.issueTracking.id,
      issueId,
    })
    return super.getIssueById(issueId)
  }

  public async listLabels(): Promise<IssueTrackingLabel[]> {
    console.debug('Jira listLabels not implemented', {
      issueTrackingId: this.issueTracking.id,
    })
    return super.listLabels()
  }

  public async listStatusTypes(): Promise<IssueTrackingStatusType[]> {
    console.debug('Jira listStatusTypes not implemented', {
      issueTrackingId: this.issueTracking.id,
    })
    return super.listStatusTypes()
  }

  public async updateIssueById(
    issueId: string,
    update: IssueTrackingIssueUpdate,
  ): Promise<IssueTrackingIssue | null> {
    console.debug('Jira updateIssueById not implemented', {
      issueTrackingId: this.issueTracking.id,
      issueId,
      update,
    })
    return super.updateIssueById(issueId, update)
  }
}
