// Copyright © 2026 Jalapeno Labs

import type { MouseEvent, ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  isOpen: boolean
  onToggle: () => void
  actions?: ReactNode
  children: ReactNode
  className?: string
}

function buildContainerClassName(className?: string) {
  if (className) {
    return `rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm
      backdrop-blur transition dark:border-white/10 dark:bg-slate-900/70 ${className}`
  }

  return `rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm
    backdrop-blur transition dark:border-white/10 dark:bg-slate-900/70`
}

export function Accordion(props: Props) {
  const {
    title,
    subtitle,
    isOpen,
    onToggle,
    actions,
    children,
    className,
  } = props

  function handleActionsClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation()
  }

  const containerClassName = buildContainerClassName(className)

  return <div className={containerClassName}>
    <div className='level items-start'>
      <button
        type='button'
        className='flex-1 text-left transition hover:opacity-90'
        onClick={onToggle}
      >
        <div className='text-sm font-semibold leading-tight'>
          {title}
        </div>
        {subtitle && (
          <div className='text-xs opacity-60'>
            {subtitle}
          </div>
        )}
      </button>
      {actions && (
        <div onClick={handleActionsClick}>
          {actions}
        </div>
      )}
    </div>
    {isOpen && (
      <div className='pt-3'>
        {children}
      </div>
    )}
  </div>
}
