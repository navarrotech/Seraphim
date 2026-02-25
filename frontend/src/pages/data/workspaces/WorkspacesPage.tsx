// Copyright © 2026 Jalapeno Labs

import type { WorkspaceWithEnv } from '@common/types'

// Core
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useHotkey } from '@frontend/hooks/useHotkey'
import { useConfirm } from '@frontend/hooks/useConfirm'

// Redux
import { useSelector } from '@frontend/framework/store'

// User Interface
import { ViewWorkspacePage } from './ViewWorkspacePage'
import { Card } from '@frontend/elements/Card'
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from '@heroui/react'
import {
  PlusIcon,
  EllipsisIcon,
  DeleteIcon,
  EditIcon,
} from '@frontend/elements/graphics/IconNexus'
import { ListItem } from '../ListItem'
import { EmptyData } from '../EmptyData'

// Utility
import { isEqual } from 'lodash-es'

// Misc
import { deleteWorkspace } from '@frontend/routes/workspaceRoutes'
import { UrlTree } from '@common/urls'

export function WorkspacesPage() {
  // Input
  const navigate = useNavigate()
  const items = useSelector((state) => state.workspaces.items)

  // State
  const [ selectedItem, select ] = useState<'new' | WorkspaceWithEnv | null>(null)

  // State maintenance
  useEffect(() => {
    if (!selectedItem || selectedItem === 'new') {
      return
    }

    const latestItem = items.find((item) => item.id === selectedItem.id)
    if (!latestItem) {
      console.debug(
        'WorkspacesPage selected item no longer exists, clearing selection',
        { selectedItem },
      )
      select(null)
      return
    }

    if (isEqual(latestItem, selectedItem)) {
      return
    }

    select(latestItem)
  }, [ items, selectedItem ])

  // Actions
  const confirm = useConfirm()
  const deselectAll = useCallback(() => {
    if (selectedItem) {
      select(null)
      return
    }

    navigate(UrlTree.tasks)
  }, [ navigate, selectedItem ])

  // Hotkeys
  useHotkey([ 'Escape' ], deselectAll, {
    preventDefault: true,
    blockOtherHotkeys: true,
  })

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
    <section className='level-centered items-start gap-6'>
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
        ? <ViewWorkspacePage
          workspace={typeof selectedItem !== 'string'
            ? selectedItem
            : undefined
          }
          close={() => select(null)}
        />
        : <></>
      }
    </section>
  </article>
}
