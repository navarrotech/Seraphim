// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

// UI
import { Alert } from '@heroui/react'

type Props = {
  errors?: string | string[] | null
}

export function DisplayErrors(props: Props) {
  const { errors } = props

  if (!errors || errors.length === 0) {
    return <></>
  }

  let title: ReactNode = <></>
  if (typeof errors === 'string') {
    title = <p>{ errors }</p>
  }
  else if (Array.isArray(errors)) {
    title = errors.map((error, index) => (
      <p key={index}>{ error }</p>
    ))
  }

  return <Alert
    color='danger'
    title={title}
  />
}
