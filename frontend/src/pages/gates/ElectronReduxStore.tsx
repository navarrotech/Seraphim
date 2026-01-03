// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'
import type { ReduxState } from '@common/types'
import type {
  Store as ReduxStore,
  Action,
  Observable,
  Unsubscribe,
} from 'redux'

// Core
import { Provider } from 'react-redux'
import { replaceEqualDeep } from '@tanstack/query-core'

type Listener = () => void
const listeners = new Set<Listener>()

// We need to cache the state snapshot because of how Redux internals work
// It does a shallow comparison to the memory reference of the current state object in memory
// It's also good for performance
let latestSnapshot: ReduxState = window.redux?.getState()
window.redux?.subscribe((nextState: ReduxState) => {
  latestSnapshot = replaceEqualDeep(latestSnapshot, nextState)
  for (const listener of listeners) {
    listener()
  }
})

const electronStore: ReduxStore<ReduxState, Action> = {
  // Anonymous functions are necessary for 'this' context binding to pass through correctly
  getState: () => latestSnapshot,
  dispatch: (action, ...extraArgs) => window.redux.dispatch(action, ...extraArgs),
  subscribe: (listener: Listener): Unsubscribe => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  // Shim the observable interface to match the Redux Store interface
  // This shim actually isn't really used by useSelector, but is required to satisfy the Redux Store interface
  [Symbol.observable](): Observable<ReduxState> {
    return {
      subscribe: (observer) => {
        const unsubscribe = electronStore.subscribe(() => {
          observer.next(latestSnapshot)
        })
        return { unsubscribe }
      },
      [Symbol.observable]() {
        return this
      },
    }
  },

  // This is an unused feature, but necessary to satisfy the Redux Store interface:
  replaceReducer: () => {
    throw new Error('replaceReducer is not supported in Electron Redux Store')
  },
}

type Props = {
  children: ReactNode
}

export function ElectronReduxStore(props: Props): ReactNode {
  return <Provider store={electronStore}>{
    props.children
  }</Provider>
}
