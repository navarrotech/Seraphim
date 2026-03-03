// Copyright © 2026 Jalapeno Labs

import type { TooltipPlacement } from '@heroui/react'
import type { DOMAttributes, ReactNode } from 'react'

// UI
import { Popover, PopoverTrigger, PopoverContent } from '@heroui/react'
import { IoMdHelpCircle } from 'react-icons/io'

type Props = {
  title?: string | ((titleProps: DOMAttributes<HTMLElement>) => ReactNode)
  content: string | ((titleProps: DOMAttributes<HTMLElement>) => ReactNode)
  placement?: TooltipPlacement
  size?: number
}

export function Information(props: Props) {
  const {
    title: Title,
    content: Content,
    placement = 'right',
    size = 24,
  } = props

  return <Popover placement={placement} backdrop='opaque' aria-label='Information'>
    <div className='opacity-30 hover:opacity-100'>
      <PopoverTrigger>
        <IoMdHelpCircle
          size={size}
          className='cursor-pointer'
        />
      </PopoverTrigger>
    </div>
    <PopoverContent>{
      (titleProps) => (
        <div className='px-1 py-2' data-id='tooltip'>
          { !!Title
            ? typeof Title === 'string'
              ? <h5
                className='mb-2 text-md font-semibold'
                { ...titleProps }
              >{ Title }</h5>
              : <Title {...titleProps} />
            : <></>
          }
          { !!Content
            ? typeof Content === 'string'
              ? <div className='text-sm'>{ Content }</div>
              : <Content {...titleProps} />
            : <></>
          }
        </div>
      )
    }</PopoverContent>
  </Popover>
}
