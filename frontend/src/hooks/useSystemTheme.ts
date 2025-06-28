// Copyright © 2025 Jalapeno Labs

// Core
import { useState, useEffect } from 'react'
import type { Theme } from '@common/types'

/**
 * useSystemTheme - A React hook that manages and optionally applies the system's color scheme theme.
 *
 * This hook initializes the theme state based on the user's system preference, listens for changes
 * to the system theme (dark or light), and updates the theme state accordingly. Optionally, it can
 * apply the detected theme as a CSS class on the document's root element.
 *
 * @example
 * // Uses the system theme and applies it to the document
 * const currentTheme = stemTheme(true);
 *
 * @param {boolean} [apply] - If true, applies the current theme as a class on the document.documentElement.
 * @return {Theme} Returns the current theme, either 'dark' or 'light'.
 */
export function useSystemTheme(apply?: boolean): Theme {
  // Initialize state with the current system theme
  const [ theme, setTheme ] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    // Default to 'light' if matchMedia is not supported
    return 'light'
  })

  // Listen for changes in the system theme preference
  useEffect(() => {
    if (!window.matchMedia) {
      return () => {}
    }

    // Create a MediaQueryList object
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Define a handler for theme changes
    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? 'dark' : 'light')
    }

    // Add the event listener for changes
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup the event listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Apply the theme to the HTML document body
  useEffect(() => {
    if (!apply) {
      return
    }

    // https://www.heroui.com/docs/customization/theme
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  }, [ theme, apply ])

  return theme
}
