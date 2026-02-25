// Copyright © 2026 Jalapeno Labs

import type { Promisable } from 'type-fest'
import type { ValidKeys, HotkeyOptions } from '@frontend/framework/hotkeys'

// Core
import { useEffect } from 'react'
import { subscribeHotkey } from '@frontend/framework/hotkeys'

export function useHotkey(
  keys: ValidKeys[],
  callback: (event: KeyboardEvent) => Promisable<void>,
  options?: HotkeyOptions,
) {
  useEffect(() => {
    if (options?.enabled === false) {
      return () => {}
    }

    return subscribeHotkey(keys, callback, options)
  }, [
    ...keys,
    callback,
    options?.enabled,
    options?.preventDefault,
    options?.stopPropagation,
    options?.blockOtherHotkeys,
  ])
}
