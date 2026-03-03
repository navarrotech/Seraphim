// Copyright © 2026 Jalapeno Labs

import type { Theme, ThemePreference } from '@common/types'
import type { ReactNode } from 'react'

// Core
import { useLayoutEffect } from 'react'
import { resolveTheme, useSystemTheme } from '@frontend/hooks/useSystemTheme'

type Props = {
  children: ReactNode
  themePreference?: ThemePreference
}

export function ThemeGate(props: Props) {
  // Get & apply the system theme to the HTML document
  const systemTheme = useSystemTheme()
  const theme = getResolvedTheme(props.themePreference, systemTheme)

  // Apply the theme to the HTML document body
  // https://www.heroui.com/docs/customization/theme
  useLayoutEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  }, [ theme ])

  return props.children
}

function getResolvedTheme(
  themePreference: ThemePreference | undefined,
  systemTheme: Theme,
): Theme {
  if (themePreference) {
    return resolveTheme(themePreference)
  }

  return systemTheme
}
