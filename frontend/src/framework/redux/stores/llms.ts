// Copyright © 2026 Jalapeno Labs

import type { LlmRecord, LlmUsage } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

export type LlmsState = {
  items: LlmRecord[]
  rateLimitsById: Record<string, LlmUsage['rateLimits'] | null>
}

const initialState: LlmsState = {
  items: [],
  rateLimitsById: {},
} as const

export const slice = createEnhancedSlice({
  name: 'llms',
  initialState,
  reducers: {
    setLlms: (state, action: PayloadAction<LlmRecord[]>) => {
      state.items = action.payload
    },
    upsertLlm: (state, action: PayloadAction<LlmRecord>) => {
      const asRecord = Object.fromEntries(state.items.map((item) => [ item.id, item ]))
      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
    },
    removeLlm: (state, action: PayloadAction<{ id: string }>) => {
      state.items = state.items.filter((llm) => llm.id !== action.payload.id)
      delete state.rateLimitsById[action.payload.id]
    },
    setLlmRateLimits: (state, action: PayloadAction<{ llmId: string, rateLimits: LlmUsage['rateLimits'] }>) => {
      const id = action.payload.llmId
      state.rateLimitsById[id] = action.payload.rateLimits
    },
  },
})

export const llmActions = slice.actions
