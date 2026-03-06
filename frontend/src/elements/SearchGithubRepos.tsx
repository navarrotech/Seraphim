// Copyright © 2026 Jalapeno Labs

import type { GithubRepoSummary } from '@common/types'

// Core
import { useState } from 'react'

// User interface
import { Autocomplete, AutocompleteItem } from '@heroui/react'

// Utility
import { useSearchGithubRepos } from '@frontend/hooks/useSearchGithubRepos'

type Props = {
  selection?: string
  onSelectionChange: (newValue: GithubRepoSummary) => void
}

export function SearchGitRepos(props: Props) {
  const [ search, setSearch ] = useState(props.selection ?? '')

  const repoSearch = useSearchGithubRepos(search, 1)

  const repoByKey = Object.fromEntries(
    repoSearch.repos.map((result) => [
      `${result.accountId}:${result.repo.id}`,
      result.repo,
    ]),
  )

  return <Autocomplete
    fullWidth
    label='Repository'
    placeholder='org/repository'
    allowsCustomValue
    isLoading={repoSearch.isLoading}
    inputValue={search}
    onInputChange={setSearch}
    onSelectionChange={(selectedKey) => {
      const selectedValue = String(selectedKey || '')
      const selectedRepo = repoByKey[selectedValue]

      if (!selectedRepo) {
        setSearch(selectedValue)
        return
      }

      setSearch(selectedRepo.fullName)
      props.onSelectionChange(selectedRepo)
    }}
    isDisabled={!repoSearch.hasGithubAccount}
    errorMessage={repoSearch.error ? 'Unable to load GitHub repositories right now.' : undefined}
  >{ repoSearch.repos.map((result) => {
    const itemKey = `${result.accountId}:${result.repo.id}`

    return <AutocompleteItem
      key={itemKey}
      textValue={result.repo.fullName}
    >{
      result.repo.fullName
    }</AutocompleteItem>
  })
  }</Autocomplete>
}
