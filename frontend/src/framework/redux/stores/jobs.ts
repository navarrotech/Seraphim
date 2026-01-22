// Copyright © 2026 Jalapeno Labs

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type JobsState = {
  todo: null
}

const initialState: JobsState = {
  todo: null,
} as const

export const slice = createEnhancedSlice({
  name: 'jobs',
  initialState,
  reducers: {
    todo: (state, action: PayloadAction<null>) => {
      state.todo = action.payload
      return state
    },
  },
})

export const jobActions = slice.actions
