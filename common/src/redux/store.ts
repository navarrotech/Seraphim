// Copyright © 2026 Jalapeno Labs

// Core
import { configureStore } from '@reduxjs/toolkit'

// Reducers
import { slice as contextSlice } from './stores/context'

// /////////////////////// //
//          Store          //
// /////////////////////// //

export const store = configureStore({
  // For all type inferrence to work correctly, we must write these out explicitly
  reducer: {
    context: contextSlice.reducer,
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
export type AppGetState = typeof store.getState

export const subscribe = store.subscribe
export type AppSubscribe = typeof store.subscribe

// /////////////////////// //
//   Advanced functions    //
// /////////////////////// //

const motherload = {
  context: contextSlice,
} as const satisfies Record<keyof ReturnType<AppGetState>, any>

export function getDefaultState() {
  return Object.fromEntries(
    Object.entries(motherload).map(([ key, slice ]) => [ key, slice.getInitialState() ]),
  ) as ReturnType<AppGetState>
}

export function resetStore() {
  for (const slice of Object.values(motherload)) {
    store.dispatch(
      slice.actions.reset(),
    )
  }
}
