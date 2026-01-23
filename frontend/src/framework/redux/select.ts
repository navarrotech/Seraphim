// Copyright © 2026 Jalapeno Labs

import type { RootState } from '@frontend/framework/store'

// Core
import { store } from '../store'

type Recall = () => void

export function select<Value>(
  selector: (state: RootState) => Value,
  listener: (value: Value, recall: Recall) => void,
) {
  // grab the initial value
  let current = selector(store.getState())

  // on every store update, re-run the selector…
  function handleChange(recall: boolean = false) {
    const next = selector(store.getState())

    // …and only fire if it really changed
    if (recall || !Object.is(next, current)) {
      current = next
      listener(next, () => handleChange(true))
    }
  }

  // subscribe & kick off the first call
  const unsubscribe = store.subscribe(handleChange)
  listener(current, () => handleChange(true))

  return unsubscribe
}
