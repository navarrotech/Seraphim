// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@prisma/client'
import type {
  IssueTrackingIssue,
  IssueTrackingIssueList,
  IssueTrackingIssueUpdate,
  IssueTrackingLabel,
  IssueTrackingListIssuesParams,
  IssueTrackingStatusType,
} from '../types'

export class IssueTracker {
  protected readonly issueTracking: IssueTracking

  constructor(issueTracking: IssueTracking) {
    this.issueTracking = issueTracking
  }

  public async check(): Promise<boolean> {
    console.debug('IssueTracker check not implemented', {
      issueTrackingId: this.issueTracking.id,
      provider: this.issueTracking.provider,
      baseUrl: this.issueTracking.baseUrl,
    })
    return false
  }

  public async listIssues(
    params: IssueTrackingListIssuesParams = {},
  ): Promise<IssueTrackingIssueList> {
    const page = params.page ?? 1
    const limit = params.limit ?? 50

    console.debug('IssueTracker listIssues not implemented', {
      issueTrackingId: this.issueTracking.id,
      provider: this.issueTracking.provider,
      search: params.search ?? null,
      page,
      limit,
    })

    return {
      items: [],
      page,
      limit,
      totalCount: 0,
    }
  }

  public async getIssueById(issueId: string): Promise<IssueTrackingIssue | null> {
    if (!issueId?.trim()) {
      console.debug('IssueTracker getIssueById received invalid issueId', {
        issueId,
      })
      return null
    }

    console.debug('IssueTracker getIssueById not implemented', {
      issueTrackingId: this.issueTracking.id,
      provider: this.issueTracking.provider,
      issueId,
    })

    return null
  }

  public async listLabels(): Promise<IssueTrackingLabel[]> {
    console.debug('IssueTracker listLabels not implemented', {
      issueTrackingId: this.issueTracking.id,
      provider: this.issueTracking.provider,
    })
    return []
  }

  public async listStatusTypes(): Promise<IssueTrackingStatusType[]> {
    console.debug('IssueTracker listStatusTypes not implemented', {
      issueTrackingId: this.issueTracking.id,
      provider: this.issueTracking.provider,
    })
    return []
  }

  public async updateIssueById(
    issueId: string,
    update: IssueTrackingIssueUpdate,
  ): Promise<IssueTrackingIssue | null> {
    if (!issueId?.trim()) {
      console.debug('IssueTracker updateIssueById received invalid issueId', {
        issueId,
      })
      return null
    }

    if (!update || Object.keys(update).length === 0) {
      console.debug('IssueTracker updateIssueById received empty update payload', {
        issueId,
        update,
      })
      return null
    }

    console.debug('IssueTracker updateIssueById not implemented', {
      issueTrackingId: this.issueTracking.id,
      provider: this.issueTracking.provider,
      issueId,
      update,
    })

    return null
  }
}
