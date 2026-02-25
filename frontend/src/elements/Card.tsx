// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

type Props = {
  id?: string
  className?: string
  wrapperClassName?: string
  label?: string
  children: ReactNode
}

export function Card(props: Props) {
  const {
    children,
    className = '',
    wrapperClassName = '',
    label,
    ...rest
  } = props

  return <div className={'w-full ' + className}>
    { label
      ? <h2 className='text-sm opacity-90 font-thin mb-1 block relative'>{
        label
      }</h2>
      : <></>
    }
    <div
      { ...rest }
      className={
        'relaxed bg-content1 rounded p-4 w-full backdrop-blur-lg bg-black/30 dark:bg-white/25'
        + ' ' + wrapperClassName
      }
    >{
      children
    }</div>
  </div>
}
