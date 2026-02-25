// Copyright © 2026 Jalapeno Labs

import type { AuthAccount } from '@common/types'

// Core
import { useState, useEffect, useCallback, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useHotkey } from '@frontend/hooks/useHotkey'
import { useConfirm } from '@frontend/hooks/useConfirm'
import { useSelector } from '@frontend/framework/store'

// Actions
import { removeAccount } from '@frontend/routes/accountsRoutes'

// User Interface
import { ViewGitAccountsPage } from './ViewGitAccountsPage'
import { Card } from '@frontend/elements/Card'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react'
import { ListItem } from '../ListItem'
import { EmptyData } from '../EmptyData'

// Iconography
import { SiGithub } from 'react-icons/si'
import { PlusIcon, EllipsisIcon, DeleteIcon, EditIcon } from '@frontend/elements/graphics/IconNexus'

// Misc
import { isEqual } from 'lodash-es'
import { UrlTree } from '@common/urls'

const IconByProvider = {
  GITHUB: <SiGithub className='icon' size={38} />,
} as const satisfies Record<AuthAccount['provider'], ReactNode>

export function GitAccountsPage() {
  // Input
  const navigate = useNavigate()
  const items = useSelector((state) => state.accounts.items)

  // State
  const [ selectedItem, select ] = useState<'new' | AuthAccount | null>(null)

  // State maintenance
  useEffect(() => {
    if (!selectedItem || selectedItem === 'new') {
      return
    }

    const latestItem = items.find((item) => item.id === selectedItem.id)
    if (!latestItem) {
      select(null)
      return
    }

    if (isEqual(latestItem, selectedItem)) {
      return
    }

    select(latestItem)
  }, [ items ])

  // Actions
  const confirm = useConfirm()
  const deselectAll = useCallback(() => {
    if (selectedItem) {
      select(null)
      return
    }

    navigate(UrlTree.tasks)
  }, [ selectedItem ])

  // Hotkeys
  useHotkey([ 'Escape' ], deselectAll, {
    preventDefault: true,
    blockOtherHotkeys: true,
  })

  return <article className='relaxed'>
    <header className='compact level'>
      <div className='level-left'>
        <h1 className='text-2xl font-bold'>Repositories</h1>
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
              key='github'
              onPress={() => {
                select('new')
              }}
            >
              <div className='level-left w-full'>
                <span className='icon'>
                  <SiGithub className='icon' />
                </span>
                <span>GitHub</span>
              </div>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </header>
    <section className='level-centered items-start gap-6'>
      <Card>{
        !items?.length
          ? <EmptyData message='No repositories connected yet.' />
          : <>
            <ul className='flex-1'>{
              items.map((account) => {
                let isSelected = false
                if (typeof selectedItem === 'object') {
                  isSelected = account.id === selectedItem?.id
                }

                return <ListItem
                  id={account.id}
                  key={account.id}
                  title={account.name}
                  description={'@' + account.username}
                  className='hide-until-hover-parent'
                  isSelected={isSelected}
                  onSelect={() => select(account)}
                  startContent={<div>{
                    IconByProvider[account.provider]
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
                      <DropdownItem key='edit' onPress={() => select(account)}>
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
                          title: 'Delete repository',
                          message: `Are you sure you want to delete the repository connection for '${account.name}'?`
                            + ' This action cannot be undone.',
                          confirmText: 'Delete',
                          confirmColor: 'danger',
                          onConfirm: async () => {
                            await removeAccount({
                              authAccount: account,
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
        ? <ViewGitAccountsPage
          account={typeof selectedItem !== 'string'
            ? selectedItem
            : null
          }
          close={() => select(null)}
        />
        : <></>
      }
    </section>
  </article>
}
