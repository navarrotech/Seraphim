// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@common/types'

// Core
import { useState, useCallback } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Redux
import { useSelector } from '@frontend/framework/store'

// User Interface
import { ViewWorkspacePage } from './ViewWorkspacePage'
import { Card } from '@frontend/elements/Card'
import { EmptyData } from '../EmptyData'
import { ListItem } from '../ListItem'
import { Button } from '@heroui/react'
import { PlusIcon } from '@frontend/elements/graphics/IconNexus'

export function WorkspacesPage() {
  // Input
  const items = useSelector((state) => state.workspaces.items)

  // State
  const [ selectedItem, select ] = useState<'new' | Workspace | null>(null)

  // Actions
  const deselectAll = useCallback(() => {
    select(null)
  }, [])

  // Hotkeys
  useHotkey([ 'Escape' ], deselectAll, { preventDefault: true })

  return <article className='relaxed'>
    <div className='compact level'>
      <div className='level-left'>
        <h1 className='text-2xl font-bold'>Workspaces</h1>
      </div>
      <div className='level-right'>
        <Button
          color='primary'
          onPress={() => {
            select('new')
          }}
        >
          <span>New Workspace</span>
          <span className='icon'>
            <PlusIcon />
          </span>
        </Button>
      </div>
    </div>
    <Card>{
      !items?.length
        ? <EmptyData message='No workspaces yet.' />
        : <>
          <div className='level-centered'>
            <ul className='flex-1'>{
            items.map((workspace) => (
              <ListItem
                key={workspace.id}
                id={workspace.id}
                title={workspace.name}
                description={workspace.description}
                isSelected={workspace.id === selectedItem}
                onSelect={() => select(workspace)}
              />
            ))
          }</ul>
          { selectedItem
            ? selectedItem === 'new'
              ? <ViewWorkspacePage />
              : <ViewWorkspacePage workspace={selectedItem} />
            : <></>
          }
        </div>
        </>
    }</Card>
  </article>
}
