// Copyright © 2026 Jalapeno Labs

// Misc
import { DEFAULT_JIRA_CLOUD_BASE_URL } from '@common/constants'

export function resolveIssueTrackingBaseUrl(baseUrl?: string | null) {
  const trimmed = baseUrl?.trim()
  const resolvedBaseUrl = trimmed?.length
    ? trimmed
    : DEFAULT_JIRA_CLOUD_BASE_URL

  if (!trimmed?.length) {
    console.debug('Issue tracking baseUrl missing, using default Jira base URL', {
      defaultBaseUrl: DEFAULT_JIRA_CLOUD_BASE_URL,
    })
  }

  if (/^https?:\/\//.test(resolvedBaseUrl)) {
    return resolvedBaseUrl.replace(/\/+$/, '')
  }

  console.debug('Issue tracking baseUrl missing protocol, defaulting to https', {
    baseUrl: resolvedBaseUrl,
  })

  return `https://${resolvedBaseUrl.replace(/\/+$/, '')}`
}
