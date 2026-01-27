// Copyright © 2026 Jalapeno Labs

import type { ThunkAction, Action } from '@reduxjs/toolkit'
import type { TypedUseSelectorHook } from 'react-redux'

// Core
import { configureStore } from '@reduxjs/toolkit'
import {
  useDispatch as useDefaultDispatch,
  useSelector as useDefaultSelector,
} from 'react-redux'

// Reducers
import { slice as accountsSlice } from './redux/stores/accounts'
import { slice as settingsSlice } from './redux/stores/settings'
import { slice as tasksSlice } from './redux/stores/tasks'
import { slice as workspacesSlice } from './redux/stores/workspaces'

// /////////////////////// //
//          Store          //
// /////////////////////// //

export const store = configureStore({
  // For all type inferrence to work correctly, we must write these out explicitly
  reducer: {
    accounts: accountsSlice.reducer,
    settings: settingsSlice.reducer,
    tasks: tasksSlice.reducer,
    workspaces: workspacesSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: true,
      serializableCheck: false,
    }),
  // Always disable devtools because we're running redux in Node.js
  devTools: false,
})

export type AppStore = typeof store

// /////////////////////// //
//    Common functions     //
// /////////////////////// //

export const dispatch = store.dispatch
export type AppDispatch = typeof store.dispatch

export const getState = store.getState
export type ReduxState = typeof store.getState

export const subscribe = store.subscribe
export type AppSubscribe = typeof store.subscribe

// /////////////////////// //
//    Common functions     //
// /////////////////////// //

export const useDispatch: () => AppDispatch = useDefaultDispatch
export const useSelector: TypedUseSelectorHook<RootState> = useDefaultSelector

// /////////////////////// //
//   Advanced functions    //
// /////////////////////// //

const motherload = {
  accounts: accountsSlice,
  settings: settingsSlice,
  tasks: tasksSlice,
  workspaces: workspacesSlice,
} as const satisfies Record<keyof ReturnType<ReduxState>, any>

export function getDefaultState() {
  return Object.fromEntries(
    Object.entries(motherload).map(([ key, slice ]) => [ key, slice.getInitialState() ]),
  ) as ReturnType<ReduxState>
}

export function resetStore() {
  for (const slice of Object.values(motherload)) {
    store.dispatch(
      slice.actions.reset(),
    )
  }
}

// /////////////////////// //
//    Typescript Types     //
// /////////////////////// //

export type RootState = ReturnType<typeof store.getState>
export type Thunk = ThunkAction<void, RootState, unknown, Action>

// /////////////////////// //
//         Globals         //
// /////////////////////// //

// @ts-ignore
window.getState = getState
