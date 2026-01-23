// Copyright © 2026 Jalapeno Labs

import type { UnsavedWorkOptions } from '@frontend/gates/UnsavedWorkGate'
import type { BlockerFunction } from 'react-router'

// Core
import { useBlocker } from 'react-router'
import { useContext, useEffect } from 'react'
import { UnsavedWorkContext } from '@frontend/gates/UnsavedWorkGate'

// Documentation:
// https://reactrouter.com/api/hooks/useBlocker

type ShouldPrevent = boolean | BlockerFunction

export function useWatchUnsavedWork(
  shouldPrevent: ShouldPrevent,
  options: Omit<UnsavedWorkOptions, 'blocker'>, // <-- Not expected to be memoized
) {
  const openUnsavedWorkPrompt = useContext(UnsavedWorkContext)

  const blocker = useBlocker((locationProps) => {
    if (shouldPrevent instanceof Function) {
      return shouldPrevent(locationProps)
    }

    return shouldPrevent
  })

  const isBlocked = blocker.state === 'blocked'

  useEffect(() => {
    if (!isBlocked) {
      return
    }

    console.debug('User attempted to leave the page with unsaved work! Prompting them to save their work.')
    openUnsavedWorkPrompt({
      ...options,
      blocker,
    })
    // Don't pass other dependency array args here, such as `options` or `blocker` here to avoid infinite loops
    // They don't need to be memoized and we only want to trigger this when isBlocked changes
  }, [ isBlocked ])
}
