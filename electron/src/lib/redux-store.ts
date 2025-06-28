// Copyright © 2025 Jalapeno Labs

// Core
import { configureStore, Action } from '@reduxjs/toolkit'

// Typescript
import type { ThunkAction } from '@reduxjs/toolkit'

// Reducers
import { slice as data } from '../dataReducer'

// /////////////////////// //
//          Store          //
// /////////////////////// //

export const store = configureStore({
  reducer: {
    data: data.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: true,
      serializableCheck: false
    })
})

// /////////////////////// //
//    Common functions     //
// /////////////////////// //

export const dispatch = store.dispatch
export const getState = store.getState

// /////////////////////// //
//    Typescript Types     //
// /////////////////////// //

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type Thunk = ThunkAction<void, RootState, unknown, Action>
