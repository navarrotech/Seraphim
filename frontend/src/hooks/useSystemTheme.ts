// Copyright © 2026 Jalapeno Labs

import type { Theme } from '@common/types'

// Core
import { useEffect, useState } from 'react'

export function useSystemTheme(): Theme {
  const [ theme, setTheme ] = useState<Theme>('light')

  useEffect(() => {
    const mediaQuery = getMediaQuery()
    if (!mediaQuery) {
      // If matchMedia is unavailable, we cannot subscribe to changes
      return () => {}
    }

    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(
        resolveTheme(undefined, event.matches),
      )
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return theme
}

function resolveTheme(
  themePreference?: Theme,
  isDarkFromMediaQuery?: boolean,
): Theme {
  const resolvedPreference = themePreference || 'system'

  if (resolvedPreference === 'light') {
    return 'light'
  }

  if (resolvedPreference === 'dark') {
    return 'dark'
  }

  return getThemeFromSystemPreference(isDarkFromMediaQuery)
}

function getThemeFromSystemPreference(isDarkFromMediaQuery?: boolean): Theme {
  if (typeof isDarkFromMediaQuery === 'boolean') {
    return isDarkFromMediaQuery ? 'dark' : 'light'
  }

  const mediaQuery = getMediaQuery()
  if (!mediaQuery) {
    console.debug('useSystemTheme could not read matchMedia, defaulting to light theme.')
    return 'light'
  }

  return mediaQuery.matches ? 'dark' : 'light'
}

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') {
    console.debug('useSystemTheme defaulting to light because window is not available.')
    return null
  }

  if (!window.matchMedia) {
    console.debug('useSystemTheme could not read matchMedia, defaulting to light theme.')
    return null
  }

  return window.matchMedia('(prefers-color-scheme: dark)')
}
