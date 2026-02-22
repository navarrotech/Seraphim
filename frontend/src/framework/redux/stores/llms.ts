// Copyright © 2026 Jalapeno Labs

import type { Llm, LlmWithRateLimits, LlmUsage } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

export type LlmsState = {
  items: LlmWithRateLimits[]
}

const initialState: LlmsState = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'llms',
  initialState,
  reducers: {
    setLlms: (state, action: PayloadAction<LlmWithRateLimits[]>) => {
      state.items = action.payload
    },
    upsertLlm: (state, action: PayloadAction<LlmWithRateLimits>) => {
      const asRecord = Object.fromEntries(state.items.map((item) => [ item.id, item ]))
      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
    },
    removeLlm: (state, action: PayloadAction<Llm>) => {
      state.items = state.items.filter((llm) => llm.id !== action.payload.id)
    },
    setLlmRateLimits: (state, action: PayloadAction<LlmUsage>) => {
      const { llmId, rateLimits } = action.payload
      const llm = state.items.find((item) => item.id === llmId)
      if (llm) {
        llm.rateLimits = rateLimits
      }
    },
  },
})

export const llmActions = slice.actions
