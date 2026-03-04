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
})
