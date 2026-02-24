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
import { AgileClient, HttpException, Version3Client } from 'jira.js'

// Utility
import { resolveIssueTrackingBaseUrl } from '../utils'

export class JiraIssueTracker extends IssueTracker {
  private readonly client: Version3Client
  private readonly agileClient: AgileClient

  constructor(issueTracking: IssueTracking) {
    super(issueTracking)

    const clientConfig = {
      host: resolveIssueTrackingBaseUrl(this.issueTracking.baseUrl),
      authentication: {
        basic: {
          email: this.issueTracking.email,
          apiToken: this.issueTracking.accessToken,
        },
      },
    }

    this.client = new Version3Client(clientConfig)
    this.agileClient = new AgileClient(clientConfig)
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
    }
    catch (error) {
      if (error instanceof HttpException && error.status === 401) {
        const errorMessage = 'Jira authentication failed. Check the email and access token.'

        console.debug('Jira issue tracking check failed due to authentication', {
          issueTrackingId: this.issueTracking.id,
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

    const [ isBoardValid, boardError ] = await this.validateTargetBoard()
    if (!isBoardValid) {
      return [ false, boardError ]
    }

    return [ true, '' ]
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

  private isNumericBoardId(value: string) {
    return /^\d+$/.test(value)
  }

  private async validateTargetBoard(): Promise<[ boolean, string ]> {
    const targetBoard = this.issueTracking.targetBoard.trim()

    if (this.isNumericBoardId(targetBoard)) {
      return this.validateBoardById(Number(targetBoard))
    }

    return this.validateBoardByProjectKey(targetBoard)
  }

  private async validateBoardById(boardId: number): Promise<[ boolean, string ]> {
    try {
      await this.agileClient.board.getBoard({ boardId })
      return [ true, '' ]
    }
    catch (error) {
      const handled = this.handleBoardValidationError(error, {
        issueTrackingId: this.issueTracking.id,
        targetBoard: String(boardId),
        targetBoardType: 'board-id',
      })
      if (handled) {
        return handled
      }

      return [ false, 'Unable to validate Jira board ID' ]
    }
  }

  private async validateBoardByProjectKey(projectKey: string): Promise<[ boolean, string ]> {
    try {
      const response = await this.agileClient.board.getAllBoards({
        projectKeyOrId: projectKey,
        maxResults: 1,
      })

      if (!response.values?.length) {
        return [ false, 'Jira project key did not match any boards' ]
      }

      return [ true, '' ]
    }
    catch (error) {
      const handled = this.handleBoardValidationError(error, {
        issueTrackingId: this.issueTracking.id,
        targetBoard: projectKey,
        targetBoardType: 'project-key',
      })
      if (handled) {
        return handled
      }

      return [ false, 'Unable to validate Jira project key' ]
    }
  }

  private handleBoardValidationError(
    error: unknown,
    context: {
      issueTrackingId: string
      targetBoard: string
      targetBoardType: 'board-id' | 'project-key'
    },
  ): [ boolean, string ] | null {
    if (error instanceof HttpException && error.status === 404) {
      const message = context.targetBoardType === 'board-id'
        ? 'Jira board ID was not found'
        : 'Jira project key was not found'

      console.debug('Jira target board not found', {
        ...context,
      })
      return [ false, message ]
    }

    if (error instanceof HttpException && error.status === 403) {
      const message = context.targetBoardType === 'board-id'
        ? 'Jira board access denied'
        : 'Jira project access denied'

      console.debug('Jira target board access denied', {
        ...context,
      })
      return [ false, message ]
    }

    if (error instanceof HttpException && error.status === 401) {
      console.debug('Jira target board authentication failed', {
        ...context,
      })
      return [ false, 'Jira authentication failed. Check the email and access token.' ]
    }

    console.debug('Jira target board validation failed', {
      ...context,
      error,
    })

    return null
  }
}
