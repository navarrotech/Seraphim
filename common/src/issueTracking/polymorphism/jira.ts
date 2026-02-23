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

// Core
import { IssueTracker } from './issueTracker'

// Lib
import { HttpException, Version3Client } from 'jira.js'

// Utility
import { resolveIssueTrackingBaseUrl } from '../utils'

export class JiraIssueTracker extends IssueTracker {
  private readonly client: Version3Client

  constructor(issueTracking: IssueTracking) {
    super(issueTracking)

    this.client = new Version3Client({
      host: resolveIssueTrackingBaseUrl(this.issueTracking.baseUrl),
      authentication: {
        basic: {
          email: this.issueTracking.email,
          apiToken: this.issueTracking.accessToken,
        },
      },
    })
  }

  public async check(): Promise<[ boolean, string ]> {
    if (!this.issueTracking.email?.trim()) {
      console.debug('Jira check failed because email is missing', {
        issueTrackingId: this.issueTracking.id,
      })
      return [ false, 'Jira email is required' ]
    }

    if (!this.issueTracking.accessToken?.trim()) {
      console.debug('Jira check failed because access token is missing', {
        issueTrackingId: this.issueTracking.id,
      })
      return [ false, 'Jira access token is required' ]
    }

    if (!this.issueTracking.targetBoard?.trim()) {
      console.debug('Jira check failed because target board is missing', {
        issueTrackingId: this.issueTracking.id,
      })
      return [ false, 'Jira target board is required' ]
    }

    try {
      await this.client.myself.getCurrentUser()
      return [ true, '' ]
    }
    catch (error) {
      if (error instanceof HttpException && error.status === 401) {
        const errorMessage = 'Jira authentication failed. Check the email and access token.'

        console.debug('Jira issue tracking check failed due to authentication', {
          issueTrackingId: this.issueTracking.id,
          error,
        })
        return [ false, errorMessage ]
      }

      const errorMessage = error instanceof Error
        ? error.message
        : 'Unable to validate Jira credentials'

      console.debug('Jira issue tracking check failed', {
        issueTrackingId: this.issueTracking.id,
        error,
      })
      return [ false, errorMessage ]
    }
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
