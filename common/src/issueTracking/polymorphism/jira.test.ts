// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@prisma/client'

// Core
import 'dotenv/config'
import { describe, expect, it } from 'vitest'

// Misc
import { IssueTrackingProvider } from '@prisma/client'
import { JiraIssueTracker } from './jira'

function getRequiredEnvValue(key: string) {
  const value = process.env[key]
  return value?.trim() || ''
}

function hasRequiredEnvValues() {
  const accessToken = getRequiredEnvValue('VITEST_JIRA_ACCESS_TOKEN')
  const email = getRequiredEnvValue('VITEST_JIRA_EMAIL')
  const targetBoard = getRequiredEnvValue('VITEST_JIRA_TARGET_BOARD')
  const baseUrl = getRequiredEnvValue('VITEST_JIRA_BASE_URL')

  return Boolean(accessToken && email && targetBoard && baseUrl)
}

describe('JiraIssueTracker', () => {
  const invalidEnvironment = !hasRequiredEnvValues()

  it.skipIf(invalidEnvironment)('check validates Jira PAT credentials', async () => {
    const issueTracking: IssueTracking = {
      id: 'jira-test',
      userId: 'jira-test-user',
      provider: IssueTrackingProvider.Jira,
      accessToken: getRequiredEnvValue('VITEST_JIRA_ACCESS_TOKEN'),
      baseUrl: getRequiredEnvValue('VITEST_JIRA_BASE_URL'),
      name: 'Jira Test Account',
      email: getRequiredEnvValue('VITEST_JIRA_EMAIL'),
      targetBoard: getRequiredEnvValue('VITEST_JIRA_TARGET_BOARD'),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const tracker = new JiraIssueTracker(issueTracking)
    const [ success, errorMessage ] = await tracker.check()

    expect(success, errorMessage).toBe(true)
  })

  it.skipIf(invalidEnvironment)('check returns a friendly error for bad emails', async () => {
    const invalidEmail = getRequiredEnvValue('VITEST_JIRA_BAD_EMAIL')
      || 'invalid-email@example.invalid'

    const issueTracking: IssueTracking = {
      id: 'jira-test-bad-email',
      userId: 'jira-test-user',
      provider: IssueTrackingProvider.Jira,
      accessToken: getRequiredEnvValue('VITEST_JIRA_ACCESS_TOKEN'),
      baseUrl: getRequiredEnvValue('VITEST_JIRA_BASE_URL'),
      name: 'Jira Test Account',
      email: invalidEmail,
      targetBoard: getRequiredEnvValue('VITEST_JIRA_TARGET_BOARD'),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const tracker = new JiraIssueTracker(issueTracking)
    const [ success, errorMessage ] = await tracker.check()

    expect(success).toBe(false)
    expect(errorMessage.toLowerCase()).toContain('email')
  })
})
