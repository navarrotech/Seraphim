// Copyright © 2026 Jalapeno Labs

import type { ForwardedRef, ReactNode } from 'react'

// Core
import useLocalStorageState from 'use-local-storage-state'
import { useState } from 'react'

// UI
import { Divider } from '@heroui/react'
import { IoChevronBackOutline, IoChevronDownOutline } from 'react-icons/io5'

// Use this over the HeroUI accordion, because HeroUI is BUGGY with having buttons in the titlebar/header
// Also this is more flexible and DnD friendly.

type Props = {
  id: string
  header: ReactNode
  children: ReactNode
  'aria-label'?: string
  className?: string
  forwardedRef?: ForwardedRef<HTMLDivElement>
  onSelectionChange?: (isExpanded: boolean) => void
  defaultExpanded?: boolean
  rememberExpanded?: boolean
}

export function Accordion(props: Props) {
  const {
    className = '',
    header,
    children,
    onSelectionChange,
    forwardedRef,
    defaultExpanded,
    rememberExpanded,
    ...restProps
  } = props

  const [ expanded, setExpanded ] = rememberExpanded
    ? useLocalStorageState<boolean>(`accordion-expanded-${props.id}`, {
      defaultValue: defaultExpanded ?? false,
    })
    : useState<boolean>(defaultExpanded ?? false)

  return <article
    ref={forwardedRef}
    className={`accordion ${className} bg-content3 rounded-2xl`}
    { ...restProps }
  >
    <div
      className='level cursor-pointer py-5 px-6'
      onClick={(event) => {
        const target = event.target as HTMLElement

        const isAnchor = target?.tagName === 'A'
        const isInformation = target?.getAttribute('aria-label') === 'Information'
        const dataSlot = target?.getAttribute('data-slot')

        if (isAnchor || isInformation || dataSlot === 'backdrop') {
          event.preventDefault()
          event.stopPropagation()
          return
        }

        const newExpanded = !expanded
        setExpanded(newExpanded)
        onSelectionChange?.(newExpanded)
      }}
    >
      { header }
      <div>
        { expanded
          ? <IoChevronDownOutline />
          : <IoChevronBackOutline />
        }
      </div>
    </div>
    { expanded
      ? <>
        <div className='px-6'>
          <Divider className='relaxed' />
        </div>
        <div className='px-6 py-4'>{
          children
        }</div>
      </>
      : null
    }
  </article>
}
