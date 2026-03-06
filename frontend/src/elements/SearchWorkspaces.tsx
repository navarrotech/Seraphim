// Copyright © 2026 Jalapeno Labs

import type { WorkspaceWithEnv } from '@common/types'

// Core
import { useEffect } from 'react'
import useLocalStorageState from 'use-local-storage-state'
import { useSelector } from '@frontend/framework/store'

// User interface
import { Autocomplete, AutocompleteItem, cn } from '@heroui/react'

type Props = {
  onSelectionChange: (workspace: WorkspaceWithEnv) => void
  className?: string
  isDisabled?: boolean
}

export function SearchWorkspaces(props: Props) {
  const workspaces = useSelector((state) => state.workspaces.items)
  const [ selection, setSelection ] = useLocalStorageState<string>(
    'search-workspaces-selection',
    { defaultValue: '' },
  )

  useEffect(() => {
    if (selection) {
      const workspaceById = Object.fromEntries(
        workspaces.map((workspace) => [ workspace.id, workspace ]),
      )
      const selectedWorkspace = workspaceById[selection]

      if (!selectedWorkspace) {
        console.debug('SearchWorkspaces could not restore workspace from selection key on initial load', {
          selection,
        })
        return
      }

      props.onSelectionChange(selectedWorkspace)
    }
  }, [])

  return <Autocomplete
    fullWidth
    label='Workspace'
    placeholder='Select a workspace'
    className={cn(props.className)}
    isDisabled={props.isDisabled}
    selectedKey={selection}
    onSelectionChange={(selectionKey) => {
      const selectedWorkspaceId = String(selectionKey || '')

      const workspaceById = Object.fromEntries(
        workspaces.map((workspace) => [ workspace.id, workspace ]),
      )
      const selectedWorkspace = workspaceById[selectedWorkspaceId]

      if (!selectedWorkspace) {
        console.debug('SearchWorkspaces could not resolve workspace from selection key', {
          selectionKey,
        })
        return
      }

      props.onSelectionChange(selectedWorkspace)
      setSelection(selectedWorkspaceId)
    }}
  >{ workspaces.map((workspace) => (
    <AutocompleteItem
      key={workspace.id}
      textValue={workspace.name}
    >{
      workspace.name
    }</AutocompleteItem>
  ))
  }</Autocomplete>
}
