// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

// Core
import { useLayoutEffect } from 'react'
import { useSystemTheme } from '@frontend/hooks/useSystemTheme'

type Props = {
  children: ReactNode
}

export function ThemeGate(props: Props) {
  // Get & apply the system theme to the HTML document
  const theme = useSystemTheme()

  // Apply the theme to the HTML document body
  // https://www.heroui.com/docs/customization/theme
  useLayoutEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  }, [ theme ])

  return props.children
}
