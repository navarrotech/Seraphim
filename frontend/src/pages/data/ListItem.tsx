// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

type Props = {
  id: string
  title?: string | ReactNode
  description?: string | ReactNode
  className?: string
  startContent?: ReactNode
  endContent?: ReactNode
  isSelected?: boolean
  onSelect?: () => void
}

export function ListItem(props: Props) {
  const { isSelected, onSelect } = props

  const className = [
    'w-full rounded p-4 cursor-pointer transition border border-divider border-3 outline-none',
    (props.onSelect && !props.isSelected) && 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20',
    (props.onSelect && props.isSelected) && 'bg-primary hover:bg-primary/90 border-primary-400',
    props.className,
  ].filter(Boolean).join(' ')

  return <li className='w-full'>
    <div
      id={props.id}
      className={className}
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <div className='level-left'>
        { props.startContent }
        <div className='text-left'>
          { typeof props.title === 'string'
            ? <h3 className='text-lg font-medium'>{
              props.title
            }</h3>
            : props.title
          }
          { typeof props.description === 'string'
            ? <p className='text-sm opacity-70'>{
              props.description
            }</p>
            : props.description
          }
        </div>
        <div className='flex-1' />
        { props.endContent }
      </div>
    </div>
  </li>
}
