// Copyright © 2026 Jalapeno Labs

import type { Key } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type {
  GithubRepoSummary,
  ListReposResponse,
} from '@frontend/lib/routes/accountsRoutes'
import type { WorkspaceFormValues } from './WorkspaceEditorForm'

// Core
import { useEffect, useState } from 'react'

// Lib
import useSWR from 'swr'

// Redux
import { useSelector } from '@frontend/framework/store'

// UI
import { Alert, Autocomplete, AutocompleteItem, Card } from '@heroui/react'

// Utility
import { useDebouncedState } from '@frontend/hooks/useDebouncedState'

// Misc
import { listRepos } from '@frontend/lib/routes/accountsRoutes'

type RepoOption = {
  accountId: string
  username: string
  name: string
  email: string | null
  repo: GithubRepoSummary
}

type RepoResult = ListReposResponse['results'][number]

type Props = {
  form: UseFormReturn<WorkspaceFormValues>
  isDisabled: boolean
}

export function WorkspaceRepositoryPicker(props: Props) {
  const authAccounts = useSelector((reduxState) => reduxState.accounts.items)
  const [ repoSearchQuery, setRepoSearchQuery ] = useState('')
  const [ selectedRepoId, setSelectedRepoId ] = useState<string | null>(null)
  const [ selectedRepoOption, setSelectedRepoOption ] = useState<RepoOption | null>(null)
  const debouncedRepoQuery = useDebouncedState(repoSearchQuery, 300)

  const shouldLoadRepos = !props.isDisabled && authAccounts.length > 0
  const reposQuery = useSWR(
    () => (shouldLoadRepos ? [ 'repo-search', debouncedRepoQuery ] : null),
    () => listRepos(debouncedRepoQuery),
  )
  const repoOptions = getRepoOptions(reposQuery.data?.results || [])
  const repoFailures = reposQuery.data?.failures || []
  const isRepoLoading = reposQuery.isLoading

  const repositoryId = props.form.watch('repositoryId')
  const repositoryFullName = props.form.watch('repositoryFullName')
  const authAccountId = props.form.watch('authAccountId')

  useEffect(() => {
    if (!selectedRepoId && repositoryId) {
      setSelectedRepoId(repositoryId.toString())
    }
  }, [ repositoryId, selectedRepoId ])

  useEffect(() => {
    if (!repoSearchQuery && repositoryFullName) {
      setRepoSearchQuery(repositoryFullName)
    }
  }, [ repoSearchQuery, repositoryFullName ])

  function clearSelection(reason: string) {
    if (repositoryId || repositoryFullName || authAccountId) {
      console.debug('WorkspaceRepositoryPicker clearing repository selection', {
        reason,
      })
    }

    setSelectedRepoId(null)
    setSelectedRepoOption(null)
    props.form.setValue('repositoryId', 0, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    props.form.setValue('repositoryFullName', '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    props.form.setValue('authAccountId', '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function handleRepoSearchChange(value: string) {
    setRepoSearchQuery(value)

    if (selectedRepoId) {
      clearSelection('Search query changed')
    }
  }

  function handleRepoSelectionChange(selection: Key | null) {
    if (!selection) {
      clearSelection('Selection cleared')
      return
    }

    const selectionKey = selection.toString()
    const matchedOption = repoOptions.find(
      (option) => option.repo.id.toString() === selectionKey,
    )

    if (!matchedOption) {
      console.debug('WorkspaceRepositoryPicker selected repo not found in results', { selectionKey })
      clearSelection('Selected repo not found')
      return
    }

    setSelectedRepoId(selectionKey)
    setSelectedRepoOption(matchedOption)
    setRepoSearchQuery(matchedOption.repo.fullName)
    props.form.setValue('authAccountId', matchedOption.accountId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    props.form.setValue('repositoryId', matchedOption.repo.id, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    props.form.setValue('repositoryFullName', matchedOption.repo.fullName, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const repositoryError = props.form.formState.errors.repositoryId?.message
    || props.form.formState.errors.repositoryFullName?.message
    || props.form.formState.errors.authAccountId?.message

  const selectedRepo = selectedRepoOption
    || repoOptions.find((option) => option.repo.id === repositoryId)

  const repoConnectionSuffix = selectedRepo?.username
    ? ` via ${selectedRepo.username}.`
    : '.'

  let repoStatusBanner = null
  if (repositoryFullName) {
    repoStatusBanner = <div className='relaxed'>
      <Alert color='success' variant='flat' className='p-4'>
        <div className='text-lg'>
          <strong>Selected repository</strong>
        </div>
        <p className='opacity-80'>
          {repositoryFullName}{repoConnectionSuffix}
        </p>
      </Alert>
    </div>
  }

  let repoErrorBanner = null
  if (reposQuery.error) {
    repoErrorBanner = <Card className='p-4'>
      <p className='opacity-80'>Unable to load repositories right now.</p>
    </Card>
  }

  let repoFailureBanner = null
  if (repoFailures.length > 0) {
    repoFailureBanner = <Card className='p-4'>
      <p className='opacity-80'>
        Some accounts failed to load repositories. Try again soon.
      </p>
    </Card>
  }

  let noAccountsBanner = null
  if (authAccounts.length === 0) {
    noAccountsBanner = <Card className='p-4'>
      <p className='opacity-80'>
        Connect a GitHub account to select a repository for this workspace.
      </p>
    </Card>
  }

  return <div className='relaxed w-full'>
    {repoStatusBanner}
    {noAccountsBanner}
    <Autocomplete
      label='Repository'
      placeholder='Type to search repositories...'
      className='w-full'
      inputValue={repoSearchQuery}
      onInputChange={handleRepoSearchChange}
      selectedKey={selectedRepoId || undefined}
      onSelectionChange={handleRepoSelectionChange}
      isLoading={isRepoLoading}
      isDisabled={props.isDisabled || authAccounts.length === 0}
      isInvalid={Boolean(repositoryError)}
      errorMessage={repositoryError}
      items={repoOptions}
    >
      {(option) =>
        <AutocompleteItem
          key={option.repo.id.toString()}
          textValue={option.repo.fullName}
        >
          <div className='flex flex-col gap-1'>
            <div className='text-sm'>
              <strong>{option.repo.fullName}</strong>
            </div>
            <div className='text-xs opacity-70'>
              {option.repo.description || 'No description provided'}
            </div>
            <div className='text-xs opacity-70'>
              Connected via {option.username}
            </div>
          </div>
        </AutocompleteItem>
      }
    </Autocomplete>
    <div className='relaxed'>{
        repoErrorBanner
      }{
        repoFailureBanner
      }</div>
  </div>
}

function getRepoOptions(results: RepoResult[]): RepoOption[] {
  const options: RepoOption[] = []

  for (const result of results) {
    for (const repo of result.repos) {
      options.push({
        accountId: result.accountId,
        username: result.username,
        name: result.name,
        email: result.email,
        repo,
      })
    }
  }

  return options
}
