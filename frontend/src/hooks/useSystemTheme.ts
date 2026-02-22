// Copyright © 2026 Jalapeno Labs

import type { Theme, ThemePreference } from '@common/types'

// Core
import { useEffect, useState } from 'react'

// Redux
import { useSelector } from '@frontend/framework/store'

/**
 * useSystemTheme - A React hook that resolves the theme from user settings or system preference.
 *
 * This hook initializes the theme state based on the user's system preference, listens for changes
 * to the system theme (dark or light), and updates the theme state accordingly. It also respects
 * the user's theme preference when available.
 *
 * @example
 * // Uses the user preference (or system theme if set to system)
 * const currentTheme = useSystemTheme()
 *
 * @return {Theme} Returns the current theme, either 'dark' or 'light'.
 */
export function useSystemTheme(): Theme {
  const themePreference = useSelector((state) => state.settings?.value.theme) as ThemePreference | undefined
  const [ theme, setTheme ] = useState<Theme>(() => resolveTheme(themePreference))

  useEffect(() => {
    setTheme(resolveTheme(themePreference))

    const mediaQuery = getMediaQuery()
    if (!mediaQuery) {
      // If matchMedia is unavailable, we cannot subscribe to changes
      return () => {}
    }

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

export function resolveTheme(
  themePreference?: ThemePreference,
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

export function getThemeFromSystemPreference(isDarkFromMediaQuery?: boolean): Theme {
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

export function getMediaQuery(): MediaQueryList | null {
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
