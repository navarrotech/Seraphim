// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@common/types'

// Core
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useSelector } from '@frontend/framework/store'

// User interface
import { Autocomplete, AutocompleteItem } from '@heroui/react'

// Utility
import { useDebouncedState } from '@frontend/hooks/useDebouncedState'

// Misc
import { listBranches } from '@frontend/routes/accountsRoutes'

type Props = {
  value?: string
  onValueChange: (value: string) => void
  workspace: Workspace
}

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_LIMIT = 20

export function SearchGitBranches(props: Props) {
  const {
    value = '',
  } = props

  const [ searchValue, setSearchValue ] = useState(value)
  const debouncedSearchValue = useDebouncedState(searchValue, SEARCH_DEBOUNCE_MS)

  const githubAccount = useSelector((state) =>
    state.accounts.items.find((account) => account.provider === 'GITHUB'),
  )
  const canSearchBranches = Boolean(props.workspace.id && githubAccount?.id)

  const swrKey = useMemo(() => {
    if (!canSearchBranches || !githubAccount?.id) {
      return null
    }

    // We intentionally use one account here because the backend endpoint requires
    // a single account id, and workspace forms currently select one branch value.
    return [
      'workspace-branches',
      props.workspace.id,
      githubAccount.id,
      debouncedSearchValue,
    ] as const
  }, [ canSearchBranches, props.workspace.id, githubAccount?.id, debouncedSearchValue ])

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
    setSearchValue(value)
  }, [ value ])

  const branches = branchSearch.data?.branches || []

  return <Autocomplete
    fullWidth
    label='Git branch template'
    placeholder='main'
    allowsCustomValue
    isLoading={branchSearch.isLoading}
    inputValue={searchValue}
    onInputChange={(nextValue) => {
      setSearchValue(nextValue)
      props.onValueChange(nextValue)
    }}
    onSelectionChange={(selectedKey) => {
      const selectedValue = String(selectedKey || '')

      setSearchValue(selectedValue)
      props.onValueChange(selectedValue)
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
