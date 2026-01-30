// Copyright © 2026 Jalapeno Labs

import type { Theme } from '@common/types'

type ResolvedTheme = 'light' | 'dark'

export function resolveTheme(
  themePreference?: Theme,
  isDarkFromMediaQuery?: boolean,
): ResolvedTheme {
  const resolvedPreference = themePreference || 'system'

  if (resolvedPreference === 'light') {
    return 'light'
  }

  if (resolvedPreference === 'dark') {
    return 'dark'
  }

  return getThemeFromSystemPreference(isDarkFromMediaQuery)
}

export function getThemeFromSystemPreference(
  isDarkFromMediaQuery?: boolean,
): ResolvedTheme {
  if (typeof isDarkFromMediaQuery === 'boolean') {
    return isDarkFromMediaQuery ? 'dark' : 'light'
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  return mediaQuery.matches ? 'dark' : 'light'
}
