// Copyright © 2025 Jalapeno Labs

// Core
import { createSlice } from '@reduxjs/toolkit'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'
import type { LanggraphJob } from '@common/types'

export type JobsState = {
  jobs: LanggraphJob[]
  openaiTokenByJobId: Record<string, string>
}

const initialState: JobsState = {
  jobs: [],
  openaiTokenByJobId: {}
} as const

export const slice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setOpenAIToken: (state, action: PayloadAction<{ jobId: string, token: string }>) => {
      const { jobId, token } = action.payload
      if (!token) {
        delete state.openaiTokenByJobId[jobId]
        return
      }
      state.openaiTokenByJobId[jobId] = token
    },
    removeJob: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter((job) => job.id !== action.payload)
      delete state.openaiTokenByJobId[action.payload]
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
      delete state.openaiTokenByJobId[action.payload]
    }
  }
})

export const jobActions = slice.actions
