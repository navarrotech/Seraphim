// Copyright © 2026 Jalapeno Labs

import type { Theme } from '@common/types'

// Core
import { useEffect, useState } from 'react'

// Utility
import { resolveTheme } from '@frontend/framework/theme'

export function useSystemTheme(themePreference: Theme = 'system') {
  const [ theme, setTheme ] = useState(() =>
    resolveTheme(themePreference),
  )

  useEffect(() => {
    if (themePreference !== 'system') {
      setTheme(resolveTheme(themePreference))
      return () => {}
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(resolveTheme(themePreference, event.matches))
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [ themePreference ])

  return theme
}
