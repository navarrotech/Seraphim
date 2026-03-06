// Copyright © 2026 Jalapeno Labs

import type { LlmWithRateLimits } from '@common/types'

// Core
import { useEffect } from 'react'
import useLocalStorageState from 'use-local-storage-state'
import { useSelector } from '@frontend/framework/store'

// User interface
import { Autocomplete, AutocompleteItem, cn } from '@heroui/react'

type Props = {
  onSelectionChange: (llm: LlmWithRateLimits) => void
  className?: string
  isDisabled?: boolean
}

export function SearchLlmAccounts(props: Props) {
  const llms = useSelector((state) => state.llms.items)
    const [ selection, setSelection ] = useLocalStorageState<string>(
      'search-llm-accounts-selection',
      { defaultValue: '' },
    )

  useEffect(() => {
    if (selection) {
      const llmById = Object.fromEntries(
        llms.map((llm) => [ llm.id, llm ]),
      )
      const selectedLlm = llmById[selection]

      if (!selectedLlm) {
        console.debug('SearchLlmAccounts could not restore LLM from selection key on initial load', {
          selection,
        })
        return
      }

      props.onSelectionChange(selectedLlm)
    }
  }, [])

  return <Autocomplete
    fullWidth
    label='LLM account'
    placeholder='Select an LLM account'
    className={cn(props.className)}
    isDisabled={props.isDisabled}
    selectedKey={selection}
    onSelectionChange={(selectionKey) => {
      const selectedLlmId = String(selectionKey || '')

      const llmById = Object.fromEntries(
        llms.map((llm) => [ llm.id, llm ]),
      )
      const selectedLlm = llmById[selectedLlmId]

      if (!selectedLlm) {
        console.debug('SearchLlmAccounts could not resolve llm from selection key', {
          selectionKey,
        })
        return
      }

      props.onSelectionChange(selectedLlm)
      setSelection(selectedLlmId)
    }}
  >{ llms.map((llm) => (
    <AutocompleteItem
      key={llm.id}
      textValue={llm.name}
    >{
      llm.name
    }</AutocompleteItem>
  ))
  }</Autocomplete>
}
