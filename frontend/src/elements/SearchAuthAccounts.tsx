// Copyright © 2026 Jalapeno Labs

import type { GitAccount } from '@common/types'

// Core
import { useEffect } from 'react'
import useLocalStorageState from 'use-local-storage-state'
import { useSelector } from '@frontend/framework/store'

// User interface
import { Autocomplete, AutocompleteItem, cn } from '@heroui/react'

type Props = {
  onSelectionChange: (account: GitAccount) => void
  className?: string
  isDisabled?: boolean
}

export function SearchAuthAccounts(props: Props) {
  const accounts = useSelector((state) => state.accounts.items)
  const [ selection, setSelection ] = useLocalStorageState<string>(
    'search-auth-accounts-selection',
    { defaultValue: '' },
  )

  useEffect(() => {
    if (selection) {
      const accountById = Object.fromEntries(
        accounts.map((account) => [ account.id, account ]),
      )
      const selectedAccount = accountById[selection]

      if (!selectedAccount) {
        console.debug('SearchAuthAccounts could not restore account from selection key on initial load', {
          selection,
        })
        return
      }

      props.onSelectionChange(selectedAccount)
    }
  }, [])

  return <Autocomplete
    fullWidth
    label='Auth account'
    placeholder='Select an auth account'
    className={cn(props.className)}
    isDisabled={props.isDisabled}
    selectedKey={selection}
    onSelectionChange={(selectionKey) => {
      const selectedAccountId = String(selectionKey || '')

      const accountById = Object.fromEntries(
        accounts.map((account) => [ account.id, account ]),
      )
      const selectedAccount = accountById[selectedAccountId]

      if (!selectedAccount) {
        console.debug('SearchAuthAccounts could not resolve account from selection key', {
          selectionKey,
        })
        return
      }

      props.onSelectionChange(selectedAccount)
      setSelection(selectedAccountId)
    }}
  >{ accounts.map((account) => (
    <AutocompleteItem
      key={account.id}
      textValue={account.name || account.username}
    >{
      account.name || account.username
    }</AutocompleteItem>
  ))
  }</Autocomplete>
}
