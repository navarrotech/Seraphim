// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@prisma/client'

// Core
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Misc
import { IssueTrackingProvider } from '@prisma/client'
import { JiraIssueTracker } from './jira'

type Context = {
  debugMock: ReturnType<typeof vi.spyOn>
}

type IssueSearchClientMock = {
  searchForIssuesUsingJql: ReturnType<typeof vi.fn>
  searchForIssuesUsingJqlEnhancedSearch: ReturnType<typeof vi.fn>
  countIssues: ReturnType<typeof vi.fn>
}

function hasRequiredEnvValues() {
  const accessToken = process.env.VITEST_JIRA_ACCESS_TOKEN
  const email = process.env.VITEST_JIRA_EMAIL
  const targetBoard = process.env.VITEST_JIRA_TARGET_BOARD
  const baseUrl = process.env.VITEST_JIRA_BASE_URL

  return Boolean(accessToken && email && targetBoard && baseUrl)
}

function buildIssueTracking(
  overrides: Partial<IssueTracking> = {},
): IssueTracking {
  return {
    id: 'jira-test',
    userId: 'jira-test-user',
    provider: IssueTrackingProvider.Jira,
    accessToken: process.env.VITEST_JIRA_ACCESS_TOKEN,
    baseUrl: process.env.VITEST_JIRA_BASE_URL,
    name: 'Jira Test Account',
    email: process.env.VITEST_JIRA_EMAIL,
    targetBoard: process.env.VITEST_JIRA_TARGET_BOARD,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function setIssueSearchClientMock(
  tracker: JiraIssueTracker,
  issueSearchClientMock: IssueSearchClientMock,
) {
  ;(tracker as unknown as {
    client: {
      issueSearch: IssueSearchClientMock
    }
  }).client = {
    issueSearch: issueSearchClientMock,
  }
}

describe('JiraIssueTracker', () => {
  const invalidEnvironment = !hasRequiredEnvValues()

  beforeEach<Context>((context) => {
    context.debugMock = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach<Context>((context) => {
    context.debugMock.mockRestore()
  })

  it.skipIf(invalidEnvironment)('check validates Jira PAT credentials', async () => {
    const tracker = new JiraIssueTracker(
      buildIssueTracking(),
    )
    const [ success, errorMessage ] = await tracker.check()

    expect(success, errorMessage).toBe(true)
  })

  it.skipIf(invalidEnvironment)('check returns a friendly error for bad emails', async () => {
    const invalidEmail = process.env.VITEST_JIRA_BAD_EMAIL
      || 'invalid-email@example.invalid'

    const tracker = new JiraIssueTracker(
      buildIssueTracking({
        id: 'jira-test-bad-email',
        email: invalidEmail,
      }),
    )
    const [ success, errorMessage ] = await tracker.check()

    expect(success).toBe(false)
    expect(errorMessage.toLowerCase()).toContain('email')
  })

  it.skipIf(invalidEnvironment)('check returns a friendly error for bad board IDs', async () => {
    const invalidBoardId = process.env.VITEST_JIRA_BAD_BOARD_ID
      || '9999999999'

    const tracker = new JiraIssueTracker(
      buildIssueTracking({
        id: 'jira-test-bad-board-id',
        targetBoard: invalidBoardId,
      }),
    )
    const [ success, errorMessage ] = await tracker.check()

    expect(success).toBe(false)
    expect(errorMessage.toLowerCase()).toContain('board')
  })

  it.skipIf(invalidEnvironment)('check returns a friendly error for bad project keys', async () => {
    const invalidProjectKey = process.env.VITEST_JIRA_BAD_PROJECT_KEY
      || 'INVALID_PROJECT_KEY_DO_NOT_USE'

    const tracker = new JiraIssueTracker(
      buildIssueTracking({
        id: 'jira-test-bad-project-key',
        targetBoard: invalidProjectKey,
      }),
    )
    const [ success, errorMessage ] = await tracker.check()

    expect(success).toBe(false)
    expect(errorMessage.toLowerCase()).toContain('project')
  })

  describe('listIssues', () => {
    it<Context>('falls back to enhanced search when legacy Jira search returns 410', async () => {
      const tracker = new JiraIssueTracker(
        buildIssueTracking({
          id: 'jira-test-410-fallback',
          targetBoard: 'LABS',
          accessToken: 'test-token',
          email: 'test@example.com',
        }),
      )

      const searchForIssuesUsingJql = vi.fn().mockRejectedValue({
        status: 410,
        response: {
          status: 410,
        },
      })
      const searchForIssuesUsingJqlEnhancedSearch = vi.fn().mockResolvedValue({
        issues: [{
          id: '10001',
          key: 'LABS-1',
          fields: {
            summary: 'Fallback issue',
            status: {
              id: '3',
            },
            labels: [ 'needs-review' ],
          },
        }],
      })
      const countIssues = vi.fn().mockResolvedValue({
        count: 27,
      })

      setIssueSearchClientMock(tracker, {
        searchForIssuesUsingJql,
        searchForIssuesUsingJqlEnhancedSearch,
        countIssues,
      })

      const result = await tracker.listIssues({
        page: 1,
        limit: 10,
      })

      expect(searchForIssuesUsingJql).toHaveBeenCalledTimes(1)
      expect(searchForIssuesUsingJqlEnhancedSearch).toHaveBeenCalledTimes(1)
      expect(countIssues).toHaveBeenCalledTimes(1)
      expect(result.totalCount).toBe(27)
      expect(result.items).toEqual([{
        id: '10001',
        key: 'LABS-1',
        summary: 'Fallback issue',
        statusId: '3',
        labels: [ 'needs-review' ],
      }])
    })

    it<Context>('returns requested page from enhanced search token pagination', async () => {
      const tracker = new JiraIssueTracker(
        buildIssueTracking({
          id: 'jira-test-enhanced-pagination',
          targetBoard: 'LABS',
          accessToken: 'test-token',
          email: 'test@example.com',
        }),
      )

      const searchForIssuesUsingJql = vi.fn().mockRejectedValue({
        status: 410,
      })
      const searchForIssuesUsingJqlEnhancedSearch = vi.fn()
        .mockResolvedValueOnce({
          issues: [{
            id: '10001',
            key: 'LABS-1',
            fields: {
              summary: 'Page 1 issue',
              status: {
                id: '3',
              },
              labels: [],
            },
          }],
          nextPageToken: 'token-page-2',
        })
        .mockResolvedValueOnce({
          issues: [{
            id: '10002',
            key: 'LABS-2',
            fields: {
              summary: 'Page 2 issue',
              status: {
                id: '4',
              },
              labels: [ 'ready' ],
            },
          }],
        })
      const countIssues = vi.fn().mockResolvedValue({
        count: 20,
      })

      setIssueSearchClientMock(tracker, {
        searchForIssuesUsingJql,
        searchForIssuesUsingJqlEnhancedSearch,
        countIssues,
      })

      const result = await tracker.listIssues({
        page: 2,
        limit: 1,
      })

      expect(searchForIssuesUsingJqlEnhancedSearch).toHaveBeenCalledTimes(2)
      expect(searchForIssuesUsingJqlEnhancedSearch).toHaveBeenNthCalledWith(1, {
        jql: 'project = "LABS"',
        nextPageToken: undefined,
        maxResults: 1,
        fields: [ 'summary', 'status', 'labels' ],
      })
      expect(searchForIssuesUsingJqlEnhancedSearch).toHaveBeenNthCalledWith(2, {
        jql: 'project = "LABS"',
        nextPageToken: 'token-page-2',
        maxResults: 1,
        fields: [ 'summary', 'status', 'labels' ],
      })
      expect(result.items[0]?.key).toBe('LABS-2')
      expect(result.totalCount).toBe(20)
    })
  })
})
