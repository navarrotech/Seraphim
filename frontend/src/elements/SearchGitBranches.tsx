// Copyright © 2026 Jalapeno Labs

// Core
import useLocalStorageState from 'use-local-storage-state'
import { useEffect, useMemo, useRef } from 'react'
import { useDebouncedState } from '@frontend/hooks/useDebouncedState'
import useSWR from 'swr'

// API
import { listBranches } from '@frontend/routes/accountsRoutes'

// User interface
import { Autocomplete, AutocompleteItem, cn } from '@heroui/react'

// Misc
import { SEARCH_DEBOUNCE_MS } from '@common/constants'

type Props = {
  value?: string
  onSelectionChange: (value: string) => void
  gitAccountId: string
  workspaceId: string
  className?: string
}

const SEARCH_LIMIT = 20

export function SearchGitBranches(props: Props) {
  const value = props.value

  const [ searchValue, setSearchValue ] = useLocalStorageState<string>(
    'search-git-branches',
    { defaultValue: '' },
  )

  const hasRestoredFromStorage = useRef(false)

  useEffect(() => {
    if (hasRestoredFromStorage.current) {
      return
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      hasRestoredFromStorage.current = true
      return
    }

    if (searchValue?.trim()) {
      hasRestoredFromStorage.current = true
      props.onSelectionChange(searchValue)
    }
  }, [ value, searchValue, props.onSelectionChange ])

  const debouncedSearchValue = useDebouncedState(searchValue, SEARCH_DEBOUNCE_MS)
  const canSearchBranches = Boolean(props.workspaceId && props.gitAccountId)

  const swrKey = useMemo(() => {
    if (!canSearchBranches || !props.gitAccountId) {
      return null
    }

    // We intentionally use one account here because the backend endpoint requires
    // a single account id, and workspace forms currently select one branch value.
    return [
      'workspace-branches',
      props.workspaceId,
      props.gitAccountId,
      debouncedSearchValue,
    ] as const
  }, [ canSearchBranches, props.workspaceId, props.gitAccountId, debouncedSearchValue ])

  const branchSearch = useSWR(
    swrKey,
    async ([ , workspaceId, gitAccountId, query ]) => listBranches({
      workspaceId,
      gitAccountId,
      q: query?.trim() || undefined,
      page: 1,
      limit: SEARCH_LIMIT,
    }),
  )

  useEffect(() => {
    if (typeof value !== 'string') {
      return
    }

    const normalizedValue = value.trim()
    if (!normalizedValue) {
      return
    }

    if (normalizedValue === searchValue) {
      return
    }

    setSearchValue(normalizedValue)
  }, [ value, searchValue, setSearchValue ])

  const branches = branchSearch.data?.branches || []

  return <Autocomplete
    fullWidth
    label='Git branch template'
    placeholder='main'
    allowsCustomValue
    isLoading={branchSearch.isLoading}
    className={cn(props.className)}
    inputValue={searchValue}
    onInputChange={(nextValue) => {
      setSearchValue(nextValue)
      props.onSelectionChange(nextValue)
    }}
    onSelectionChange={(selectedKey) => {
      const selectedValue = String(selectedKey || '')

      setSearchValue(selectedValue)
      props.onSelectionChange(selectedValue)
    }}
    isDisabled={!canSearchBranches}
    errorMessage={branchSearch.error ? 'Unable to load branches right now.' : undefined}
  >{ branches.map((branch) => (
    <AutocompleteItem key={branch.name}>{
      branch.name
    }</AutocompleteItem>
  ))
  }</Autocomplete>
}
