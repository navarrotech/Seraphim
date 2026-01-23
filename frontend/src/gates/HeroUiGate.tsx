// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

// Core
import { useNavigate, useHref } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'

type Props = {
  children: ReactNode
}

export function HeroUIProviderCustom(props: Props) {
  // Note: useNavigate can only be used in the context (child) of a Router
  const navigate = useNavigate()

  return <HeroUIProvider navigate={navigate} useHref={useHref}>{
    props.children
  }</HeroUIProvider>
}
