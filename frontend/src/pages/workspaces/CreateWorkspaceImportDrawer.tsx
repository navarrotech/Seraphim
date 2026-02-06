// Copyright © 2026 Jalapeno Labs

import type { Key } from 'react'
import type {
  GithubRepoSummary,
  ListReposResponse,
} from '@frontend/lib/routes/accountsRoutes'

// Core
import { useEffect, useState } from 'react'

// Lib
import useSWR from 'swr'

// User interface
import {
  Autocomplete,
  AutocompleteItem,
  Alert,
  Button,
  Card,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@heroui/react'

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
  isOpen: boolean
  isDisabled: boolean
  onOpenChange: (isOpen: boolean) => void
  onImport: (repoOption: RepoOption) => void
}

export function CreateWorkspaceImportDrawer(props: Props) {
  const [ repoSearchQuery, setRepoSearchQuery ] = useState('')
  const [ selectedRepoId, setSelectedRepoId ] = useState<string | null>(null)
  const [ selectedRepoOption, setSelectedRepoOption ] = useState<RepoOption | null>(null)
  const debouncedRepoQuery = useDebouncedState(repoSearchQuery, 300)

  const shouldLoadRepos = props.isOpen && !props.isDisabled
  const reposQuery = useSWR(
    () => (shouldLoadRepos ? [ 'repo-search', debouncedRepoQuery ] : null),
    () => listRepos(debouncedRepoQuery),
  )
  const repoOptions = getRepoOptions(reposQuery.data?.results || [])
  const repoFailures = reposQuery.data?.failures || []
  const isRepoLoading = reposQuery.isLoading
  const isImportActionDisabled = !selectedRepoOption || isRepoLoading

  useEffect(() => {
    if (props.isOpen) {
      return
    }

    setRepoSearchQuery('')
    setSelectedRepoId(null)
    setSelectedRepoOption(null)
  }, [ props.isOpen ])

  function handleRepoSearchChange(value: string) {
    setRepoSearchQuery(value)

    setSelectedRepoId(null)
    setSelectedRepoOption(null)
  }

  function handleRepoSelectionChange(selection: Key | null) {
    if (!selection) {
      setSelectedRepoId(null)
      setSelectedRepoOption(null)
      return
    }

    const selectionKey = selection.toString()
    const matchedOption = repoOptions.find(
      (option) => option.repo.id.toString() === selectionKey,
    )

    if (!matchedOption) {
      console.debug('CreateWorkspaceImportDrawer selected repo not found in results', { selectionKey })
      setSelectedRepoId(null)
      setSelectedRepoOption(null)
      return
    }

    setSelectedRepoId(selectionKey)
    setSelectedRepoOption(matchedOption)
  }

  function handleImportRepo() {
    if (!selectedRepoOption) {
      console.debug('CreateWorkspaceImportDrawer import requested without a selected repo')
      return
    }

    props.onImport(selectedRepoOption)
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

  let selectedRepoBanner = null
  if (selectedRepoOption) {
    selectedRepoBanner = <div className='relaxed'>
      <Alert color='success' variant='flat' className='p-4'>
        <div className='text-lg'>
          <strong>Selected repository</strong>
        </div>
        <p className='opacity-80'>
          {selectedRepoOption.repo.fullName} via {selectedRepoOption.username}.
        </p>
      </Alert>
    </div>
  }

  return <Drawer
    placement='right'
    isOpen={props.isOpen}
    onOpenChange={props.onOpenChange}
  >
    <DrawerContent>
      <DrawerHeader>
        <div className='relaxed'>
          <div className='text-2xl'>
            <strong>Import repository</strong>
          </div>
          <p className='opacity-80'>
            Search GitHub repositories connected to your accounts.
          </p>
        </div>
      </DrawerHeader>
      <DrawerBody>
        <div className='relaxed'>
          { selectedRepoBanner }
          <Autocomplete
            label='Repository'
            placeholder='Type to search repositories...'
            className='w-full'
            inputValue={repoSearchQuery}
            onInputChange={handleRepoSearchChange}
            selectedKey={selectedRepoId || undefined}
            onSelectionChange={handleRepoSelectionChange}
            isLoading={isRepoLoading}
            isDisabled={props.isDisabled}
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
      </DrawerBody>
      <DrawerFooter>
        <div className='relaxed w-full'>
          <Button
            color='primary'
            type='button'
            className='w-full compact'
            isDisabled={isImportActionDisabled}
            onPress={handleImportRepo}
          >
            <span>Import</span>
          </Button>
          <Button
            variant='light'
            type='button'
            className='w-full compact'
            onPress={() => props.onOpenChange(false)}
          >
            <span>Cancel</span>
          </Button>
        </div>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
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

export type { RepoOption }
