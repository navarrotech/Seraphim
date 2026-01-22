// Copyright © 2026 Jalapeno Labs

import { describe, it, expect } from 'vitest'
import { createAction } from '@reduxjs/toolkit'

import { createEnhancedSlice } from './createEnhancedSlice'

describe('createEnhancedSlice', () => {
  it('adds a default reset reducer that returns the initial state', () => {
    const initialState = { count: 0, label: 'init' }

    const slice = createEnhancedSlice({
      name: 'counter',
      initialState,
      reducers: {
        increment: (state) => {
          // mutate-style update (immer under the hood)
          state.count += 1
        },
      },
    })

    const { reducer, actions } = slice

    // starts at initial
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState)

    // increment once
    const afterInc = reducer(initialState, actions.increment())
    expect(afterInc.count).toBe(1)

    // reset should bring it back to initial
    const afterReset = reducer(afterInc, actions.reset())
    expect(afterReset).toEqual(initialState)
  })

  it('preserves provided reducers and slice name', () => {
    const initialState = { value: 10 }

    const slice = createEnhancedSlice({
      name: 'testSlice',
      initialState,
      reducers: {
        set: (_state, action: { payload: number }) => ({ value: action.payload }),
      },
    })

    expect(slice.name).toBe('testSlice')
    expect(typeof slice.actions.set).toBe('function')
    expect(typeof slice.actions.reset).toBe('function')

    const s1 = slice.reducer(undefined, { type: '@@INIT' })
    const s2 = slice.reducer(s1, slice.actions.set(42))
    expect(s2).toEqual({ value: 42 })
  })

  it('allows user-defined reset reducer to override the default', () => {
    const initialState = { n: 1 }

    const slice = createEnhancedSlice({
      name: 'overrideReset',
      initialState,
      reducers: {
        // This should override the default reset added by createEnhancedSlice
        reset: () => ({ n: 999 }),
        bump: (state) => {
          state.n += 1
        },
      },
    })

    const afterBump = slice.reducer(initialState, slice.actions.bump())
    expect(afterBump).toEqual({ n: 2 })

    // Our custom reset should win over the injected default
    const afterReset = slice.reducer(afterBump, slice.actions.reset())
    expect(afterReset).toEqual({ n: 999 })
  })

  it('passes through extraReducers correctly', () => {
    const otherAction = createAction<number>('external/add')
    type State = { total: number }
    const initialState: State = { total: 0 }

    const slice = createEnhancedSlice({
      name: 'withExtra',
      initialState,
      reducers: {},
      extraReducers: (builder) => {
        builder.addCase(otherAction, (state, action) => {
          state.total += action.payload
        })
      },
    })

    const afterExternal = slice.reducer(initialState, otherAction(5))
    expect(afterExternal.total).toBe(5)

    // Ensure reset still exists alongside extraReducers
    const afterReset = slice.reducer(afterExternal, slice.actions.reset())
    expect(afterReset).toEqual(initialState)
  })
})
