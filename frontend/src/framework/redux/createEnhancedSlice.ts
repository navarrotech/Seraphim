// Copyright © 2026 Jalapeno Labs

// Core
import type { CaseReducer, CreateSliceOptions, Slice, SliceCaseReducers } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

type ResetReducer<State> = {
  reset: CaseReducer<State>
}

type ResettableReducers<State, Reducers extends SliceCaseReducers<State>> = ResetReducer<State> & Reducers

/**
 * A typed wrapper around RTK's `createSlice` that injects a `reset()` action returning the
 * slice's `initialState`.
 *
 * Note: we intentionally require `initialState` to be a concrete value (not a factory
 * function) so `reset()` can return it with correct static typing.
 */
export function createEnhancedSlice<
  State,
  Reducers extends SliceCaseReducers<State>,
  Name extends string,
>(
  options: Omit<CreateSliceOptions<State, Reducers, Name>, 'reducers' | 'initialState'> & {
    initialState: State
    reducers: Reducers
  },
): Slice<State, ResettableReducers<State, Reducers>, Name> {
  const enhancedOptions: CreateSliceOptions<State, ResettableReducers<State, Reducers>, Name> = {
    ...options,
    // Use the callback form to avoid RTK's `ValidateSliceCaseReducers` mapped-type
    // incompatibility caused by spreading `options.reducers` into an object literal.
    reducers: () => ({
      reset: () => options.initialState,
      ...options.reducers,
    }),
  }

  return createSlice(enhancedOptions)
}
