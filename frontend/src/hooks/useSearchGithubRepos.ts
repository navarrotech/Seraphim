// Copyright © 2026 Jalapeno Labs

import type { GithubRepoSummary } from '@common/types'

// Core
import useSWR from 'swr'
import { useSelector } from '@frontend/framework/store'
import { useDebouncedState } from './useDebouncedState'

// API
import { listRepos } from '@frontend/routes/accountsRoutes'

// Misc
import { SEARCH_DEBOUNCE_MS } from '@common/constants'

type SearchResult = {
  accountId: string
  username: string
  name: string
  email: string
  repo: GithubRepoSummary
}

export function useSearchGithubRepos(searchValue: string, page: number = 1) {
  const hasGithubAccount = useSelector((state) =>
    state.accounts.items.some((account) => account.provider === 'GITHUB'),
  )

  const debouncedSearchValue = useDebouncedState(searchValue, SEARCH_DEBOUNCE_MS)

  const repoSearch = useSWR(
    hasGithubAccount
    ? [
      'github-repos-search',
      debouncedSearchValue,
      page,
    ] as const
    : null,
    async ([ , query, searchPage ]) => listRepos({
      q: query?.trim() || undefined,
      page: searchPage,
      visibility: 'all',
    }),
  )

  const repos: SearchResult[] = []
  for (const result of repoSearch.data?.results || []) {
    for (const repo of result.repos) {
      repos.push({
        accountId: result.accountId,
        username: result.username,
        name: result.name,
        email: result.email,
        repo,
      })
    }
  }

  return {
    hasGithubAccount,
    repos,
    failures: repoSearch.data?.failures || [],
    isLoading: repoSearch.isLoading,
    error: repoSearch.error,
  } as const
}
