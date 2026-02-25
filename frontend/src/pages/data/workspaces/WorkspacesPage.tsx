// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@common/types'

// Core
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useHotkey } from '@frontend/hooks/useHotkey'
import { useConfirm } from '@frontend/hooks/useConfirm'

// Redux
import { useSelector } from '@frontend/framework/store'

// Actions
import { deleteWorkspace } from '@frontend/routes/workspaceRoutes'

// User Interface
import { ViewWorkspacePage } from './ViewWorkspacePage'
import { Card } from '@frontend/elements/Card'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react'
import { PlusIcon, EllipsisIcon, DeleteIcon, EditIcon } from '@frontend/elements/graphics/IconNexus'
import { ListItem } from '../ListItem'
import { EmptyData } from '../EmptyData'
import { UrlTree } from '@common/urls'

export function WorkspacesPage() {
  // Input
  const navigate = useNavigate()
  const items = useSelector((state) => state.workspaces.items)

  // State
  const [ selectedItem, select ] = useState<'new' | Workspace | null>(null)

  // Actions
  const confirm = useConfirm()
  const deselectAll = useCallback(() => {
    if (selectedItem) {
      select(null)
    }

    navigate(UrlTree.tasks)
  }, [ selectedItem ])

  // Hotkeys
  useHotkey([ 'Escape' ], deselectAll, { preventDefault: true })

  return <article className='relaxed'>
    <header className='compact level'>
      <div className='level-left'>
        <h1 className='text-2xl font-bold'>Workspaces</h1>
      </div>
      <div className='level-right'>
        <Button color='primary' className='font-semibold' onPress={() => select('new')}>
          <span>New Workspace</span>
          <span className='icon'>
            <PlusIcon />
          </span>
        </Button>
      </div>
    </header>
    <section className='level-centered gap-6'>
      <Card>{
        !items?.length
          ? <EmptyData message='No workspaces yet.' />
          : <>
            <ul className='flex-1'>{
              items.map((workspace) => {
                let isSelected = false
                if (typeof selectedItem === 'object') {
                  isSelected = workspace.id === selectedItem?.id
                }

                let description = workspace.description
                if (!description) {
                  description = 'No description yet'
                }

                return <ListItem
                  id={workspace.id}
                  key={workspace.id}
                  title={workspace.name}
                  description={description}
                  className='hide-until-hover-parent'
                  isSelected={isSelected}
                  onSelect={() => select(workspace)}
                  endContent={<Dropdown placement='bottom-end' className='hide-until-hover'>
                    <DropdownTrigger>
                      <Button isIconOnly variant='light'>
                        <span className='icon'>
                          <EllipsisIcon />
                        </span>
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label='Static Actions'>
                      <DropdownItem key='edit' onPress={() => select(workspace)}>
                        <div className='level-left w-full'>
                          <span className='icon'>
                            <EditIcon className='icon' />
                          </span>
                          <span>Edit</span>
                        </div>
                      </DropdownItem>
                      <DropdownItem
                        key='delete'
                        color='danger'
                        onPress={() => confirm({
                          title: 'Delete workspace',
                          message: `Are you sure you want to delete '${workspace.name}'?`
                            + ' This action cannot be undone.',
                          confirmText: 'Delete',
                          confirmColor: 'danger',
                          onConfirm: async () => {
                            await deleteWorkspace({
                              id: workspace.id,
                            })
                          },
                        })}
                      >
                        <div className='level-left w-full'>
                          <span className='icon'>
                            <DeleteIcon className='icon' />
                          </span>
                          <span>Delete</span>
                        </div>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>}
                />
              })
            }</ul>
          </>
      }</Card>
      { selectedItem
        ? selectedItem === 'new'
          ? <ViewWorkspacePage />
          : <ViewWorkspacePage workspace={selectedItem} />
        : <></>
      }
    </section>
  </article>
}
