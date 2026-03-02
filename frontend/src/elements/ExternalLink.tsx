// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

// UI
import { OpenIcon } from '@frontend/elements/graphics/IconNexus'

type Props = {
  href: string
  children: ReactNode
}

export function ExternalLink(props: Props) {
  const { href, children } = props

  return <a
    className='mb-2 level-left gap-1 text-blue-500 hover:text-blue-400'
    href={href}
    target='_blank'
  >
    <span>{
      children
    }</span>
    <span className='icon'>
      <OpenIcon />
    </span>
  </a>
}
