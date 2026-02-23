// Copyright © 2026 Jalapeno Labs

// Misc
import { DEFAULT_JIRA_CLOUD_BASE_URL } from '@common/constants'

export function resolveIssueTrackingBaseUrl(baseUrl?: string | null) {
  const trimmed = baseUrl?.trim()

  if (trimmed) {
    return trimmed.replace(/\/+$/, '')
  }

  console.debug('Issue tracking baseUrl missing, using default Jira base URL', {
    defaultBaseUrl: DEFAULT_JIRA_CLOUD_BASE_URL,
  })

  return DEFAULT_JIRA_CLOUD_BASE_URL
}
