// Copyright © 2026 Jalapeno Labs

// Core
import { configureStore, Action } from '@reduxjs/toolkit'
import {
  useDispatch as useDefaultDispatch,
  useSelector as useDefaultSelector,
} from 'react-redux'

// Typescript
import type { ThunkAction } from '@reduxjs/toolkit'
import type { TypedUseSelectorHook } from 'react-redux'

// Reducers
import { slice as authSlice } from '@frontend/stores/auth/reducer'
import { slice as dataSlice } from '@frontend/stores/data/reducer'

// /////////////////////// //
//          Store          //
// /////////////////////// //

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    data: dataSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: true,
      serializableCheck: false,
    }),
  devTools: import.meta.env.DEV,
})

// /////////////////////// //
//    Common functions     //
// /////////////////////// //

export const dispatch = store.dispatch
export const getState = store.getState

export const useDispatch: () => AppDispatch = useDefaultDispatch
export const useSelector: TypedUseSelectorHook<RootState> = useDefaultSelector

// /////////////////////// //
//    Typescript Types     //
// /////////////////////// //

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type Thunk = ThunkAction<void, RootState, unknown, Action>
