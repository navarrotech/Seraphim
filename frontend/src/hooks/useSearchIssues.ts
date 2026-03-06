// Copyright © 2026 Jalapeno Labs

import type { IssueTrackingIssue } from '@common/issueTracking/types'
import type { IssueTrackingSearchMode } from '@common/issueTracking/types'

// Core
import useSWR from 'swr'
import { useSelector } from '@frontend/framework/store'
import { useDebouncedState } from './useDebouncedState'

// API
import { listIssueTrackingIssues } from '@frontend/routes/issueTrackingRoutes'

// Misc
import { SEARCH_DEBOUNCE_MS } from '@common/constants'


export function useSearchIssues(
  searchValue: string,
  mode: IssueTrackingSearchMode,
  page: number = 1,
  limit: number = 20,
) {
  const issueTracking = useSelector((state) =>
    state.issueTracking.items.find((issueTracking) => issueTracking.provider === 'Jira'),
  )

  const debouncedSearchValue = useDebouncedState(searchValue, SEARCH_DEBOUNCE_MS)

  const issueSearch = useSWR(
    issueTracking?.id
    ? [
      'jira-issues-search',
      issueTracking.id,
      debouncedSearchValue,
      mode,
      page,
      limit,
    ] as const
    : null,
    async ([ , issueTrackingId, query, searchMode, searchPage, searchLimit ]) => listIssueTrackingIssues({
      issueTrackingId,
      q: query?.trim() || undefined,
      mode: searchMode,
      page: searchPage,
      limit: searchLimit,
    }),
  )

  const issues: IssueTrackingIssue[] = issueSearch.data?.items || []

  return {
    issueTracking: issueTracking || null,
    issues,
    totalCount: issueSearch.data?.totalCount || 0,
    mode,
    page,
    limit,
    isLoading: issueSearch.isLoading,
    error: issueSearch.error,
  } as const
}
