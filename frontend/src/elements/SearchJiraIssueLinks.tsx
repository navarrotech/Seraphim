// Copyright © 2026 Jalapeno Labs

import type { IssueTrackingSearchMode } from '@common/issueTracking/types'
import type { Selection } from '@react-types/shared'

// Core
import { useState } from 'react'

// User interface
import { Autocomplete, AutocompleteItem, Select, SelectItem } from '@heroui/react'

// Utility
import { useSearchJiraIssues } from '@frontend/hooks/useSearchJiraIssues'

type Props = {
  onSelection: (value: string) => void
  defaultMode?: IssueTrackingSearchMode
  page?: number
  limit?: number
}

export function SearchJiraIssueLinks(props: Props) {
  const {
    page = 1,
    limit = 10,
  } = props

  const [ search, setSearch ] = useState<string>('')
  const [ mode, setMode ] = useState<IssueTrackingSearchMode>(props.defaultMode ?? 'text')

  const issueSearch = useSearchJiraIssues(search, mode, page, limit)

  return <div className='level gap-2 items-end'>
    <Autocomplete
      className='w-full'
      fullWidth
      label='Jira issue link'
      placeholder='PROJ-123'
      allowsCustomValue
      isLoading={issueSearch.isLoading}
      value={search}
      onValueChange={setSearch}
      onSelectionChange={(selectedKey) => {
        if (!selectedKey) {
          return
        }

        const selectedValue = String(selectedKey || '')
        props.onSelection(selectedValue)
      }}
      isDisabled={!issueSearch.issueTracking?.id}
      errorMessage={issueSearch.error ? 'Unable to load Jira issues right now.' : undefined}
      isInvalid={!!issueSearch.error && Boolean(search)}
    >{ issueSearch.issues.map((issue) => (
      <AutocompleteItem
        key={issue.key}
        textValue={issue.key}
      >{
        `${issue.key} - ${issue.summary}`
      }</AutocompleteItem>
    ))
    }</Autocomplete>
    <Select
      className='w-32'
      label='Mode'
      disallowEmptySelection
      selectedKeys={[ mode ]}
      onSelectionChange={(selection: Selection) => {
        if (selection === 'all') {
          console.debug('SearchJiraIssueLinks received invalid mode selection "all"')
          return
        }

        const [ selectedKey ] = Array.from(selection)
        if (selectedKey !== 'text' && selectedKey !== 'jql') {
          console.debug('SearchJiraIssueLinks received unknown mode selection key', {
            selectedKey,
          })
          return
        }

        setMode(selectedKey)
      }}
      isDisabled={!issueSearch.issueTracking?.id}
    >
      <SelectItem key='text'>Text</SelectItem>
      <SelectItem key='jql'>JQL</SelectItem>
    </Select>
  </div>
}
