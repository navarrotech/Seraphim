// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@common/types'

// Core
import { useState, useCallback } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Redux
import { useSelector } from '@frontend/framework/store'

// User Interface
import { ViewIssueTrackingPage } from './ViewIssueTrackingPage'
import { Card } from '@frontend/elements/Card'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react'
import { SiJirasoftware } from 'react-icons/si'
import { PlusIcon } from '@frontend/elements/graphics/IconNexus'

export function IssueTrackingPage() {
  // Input
  const items = useSelector((state) => state.issueTracking.items)

  // State
  const [ selectedItem, select ] = useState<'new' | IssueTracking | null>(null)

  // Actions
  const deselectAll = useCallback(() => {
    select(null)
  }, [])

  // Hotkeys
  useHotkey([ 'Escape' ], deselectAll, { preventDefault: true })

  return <article className='relaxed'>
    <div className='compact level'>
      <div className='level-left'>
        <h1 className='text-2xl font-bold'>Issue tracking</h1>
      </div>
      <div className='level-right'>
        <Dropdown placement='bottom-end'>
          <DropdownTrigger>
            <Button
              color='primary'
            >
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
    </div>
    <Card>{
      !items?.length
        ? <>
          <p className='opacity-70'>No issue tracking connections yet.</p>
        </>
        : <>
          <div className='level-centered'>
            <ul className='flex-1'>{
            items.map((issueTracking) => (
              <IssueTrackingItem
                key={issueTracking.id}
                issueTracking={issueTracking}
                isSelected={issueTracking.id === selectedItem}
                onSelect={select}
              />
            ))
          }</ul>
          { selectedItem
            ? selectedItem === 'new'
              ? <ViewIssueTrackingPage />
              : <ViewIssueTrackingPage issueTracking={selectedItem} />
            : <></>
          }
        </div>
        </>
    }</Card>
  </article>
}

type IssueTrackingItemProps = {
  issueTracking: IssueTracking
  isSelected: boolean
  onSelect: (issueTracking: IssueTracking) => void
}

function IssueTrackingItem(props: IssueTrackingItemProps) {
  const { issueTracking, isSelected, onSelect } = props

  const className = [
    'w-full rounded p-4 cursor-pointer transition border border-divider',
    props.isSelected && 'border border-primary/60 ring-2 ring-primary/40',
  ].filter(Boolean).join(' ')

  return <li className='w-full'>
    <button
      id={issueTracking.id}
      className={className}
      role='button'
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => {
        onSelect(issueTracking)
      }}
    >
      <div className='level'>
        <div>
          <div className='text-lg font-semibold'>{issueTracking.name}</div>
          <div className='opacity-70 text-sm'>{issueTracking.email}</div>
        </div>
        <div className='text-sm opacity-70'>{issueTracking.provider}</div>
      </div>
      <div className='opacity-70 text-sm'>Board: {issueTracking.targetBoard}</div>
    </button>
  </li>
}
