// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'
import type { IssueTracking } from '@common/types'

// Core
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useHotkey } from '@frontend/hooks/useHotkey'
import { useConfirm } from '@frontend/hooks/useConfirm'

// Redux
import { useSelector } from '@frontend/framework/store'

// Actions
import { deleteIssueTracking } from '@frontend/routes/issueTrackingRoutes'

// User Interface
import { ViewIssueTrackingPage } from './ViewIssueTrackingPage'
import { Card } from '@frontend/elements/Card'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react'
import { SiJirasoftware } from 'react-icons/si'
import { PlusIcon, EllipsisIcon, DeleteIcon, EditIcon } from '@frontend/elements/graphics/IconNexus'
import { ListItem } from '../ListItem'
import { EmptyData } from '../EmptyData'
import { UrlTree } from '@common/urls'

const IconByProvider = {
  Jira: <SiJirasoftware className='icon' size={38} />,
} as const satisfies Record<IssueTracking['provider'], ReactNode>

export function IssueTrackingPage() {
  // Input
  const navigate = useNavigate()
  const items = useSelector((state) => state.issueTracking.items)

  // State
  const [ selectedItem, select ] = useState<'new' | IssueTracking | null>(null)

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
        <h1 className='text-2xl font-bold'>Issue tracking</h1>
      </div>
      <div className='level-right'>
        <Dropdown placement='bottom-end'>
          <DropdownTrigger>
            <Button color='primary' className='font-semibold'>
              <span>Link New</span>
              <span className='icon'>
                <PlusIcon />
              </span>
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label='Static Actions'>
            <DropdownItem
              key='jira'
              onPress={() => {
                select('new')
              }}
            >
              <div className='level-left w-full'>
                <span className='icon'>
                  <SiJirasoftware className='icon' />
                </span>
                <span>Jira</span>
              </div>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </header>
    <section className='level-centered gap-6'>
      <Card>{
        !items?.length
          ? <EmptyData message='No issue tracking connections yet.' />
          : <>
            <ul className='flex-1'>{
              items.map((issueTracking) => {
                let isSelected = false
                if (typeof selectedItem === 'object') {
                  isSelected = issueTracking.id === selectedItem?.id
                }

                const description = `${issueTracking.email} • ${issueTracking.targetBoard}`

                return <ListItem
                  id={issueTracking.id}
                  key={issueTracking.id}
                  title={issueTracking.name}
                  description={description}
                  className='hide-until-hover-parent'
                  isSelected={isSelected}
                  onSelect={() => select(issueTracking)}
                  startContent={<div>{
                    IconByProvider[issueTracking.provider]
                  }</div>}
                  endContent={<Dropdown placement='bottom-end' className='hide-until-hover'>
                    <DropdownTrigger>
                      <Button isIconOnly variant='light'>
                        <span className='icon'>
                          <EllipsisIcon />
                        </span>
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label='Static Actions'>
                      <DropdownItem key='edit' onPress={() => select(issueTracking)}>
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
                          title: 'Delete issue tracking account',
                          message: `Are you sure you want to delete '${issueTracking.name}'?`
                            + ' This action cannot be undone.',
                          confirmText: 'Delete',
                          confirmColor: 'danger',
                          onConfirm: async () => {
                            await deleteIssueTracking(issueTracking)
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
          ? <ViewIssueTrackingPage />
          : <ViewIssueTrackingPage issueTracking={selectedItem} />
        : <></>
      }
    </section>
  </article>
}
