// Copyright © 2026 Jalapeno Labs

import type { ReduxState } from '@common/types'

// Core
import { store } from './store'

export function select<Value>(
  selector: (state: ReduxState) => Value,
  listener: (value: Value) => void,
) {
  // grab the initial value
  let current = selector(store.getState())

  // on every store update, re-run the selector…
  function handleChange() {
    const next = selector(store.getState())

    // …and only fire if it really changed
    if (!Object.is(next, current)) {
      current = next
      listener(next)
    }
  }

  // subscribe & kick off the first call
  const unsubscribe = store.subscribe(handleChange)
  listener(current)

  return unsubscribe
}
