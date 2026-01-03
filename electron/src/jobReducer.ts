// Copyright © 2026 Jalapeno Labs

// Core
import { createSlice } from '@reduxjs/toolkit'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'
import type { LanggraphJob } from '@common/types'

export type JobsState = {
  jobs: LanggraphJob[]
}

const initialState: JobsState = {
  jobs: [],
} as const

export const slice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    removeJob: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter((job) => job.id !== action.payload)
    },
    addJob: (state, action: PayloadAction<LanggraphJob>) => {
      state.jobs.push(action.payload)
    },
    cancelJob: (state, action: PayloadAction<string>) => {
      const job = state.jobs.find((job) => job.id === action.payload)
      if (job) {
        job.controller.abort('Job cancelled by user')
        state.jobs = state.jobs.filter((job) => job.id !== action.payload)
      }
    },
  },
})

export const jobActions = slice.actions
