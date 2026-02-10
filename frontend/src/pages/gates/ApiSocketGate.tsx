// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

// Core
import { useApiSocket } from '@frontend/hooks/useApiSocket'

type Props = {
  children: ReactNode
}

export function ApiSocketGate(props: Props) {
  useApiSocket()

  return props.children
}
