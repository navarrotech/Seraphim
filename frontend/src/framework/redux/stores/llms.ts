// Copyright © 2026 Jalapeno Labs

import type { LlmRecord } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

export type LlmsState = {
  items: LlmRecord[]
}

const initialState: LlmsState = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'llms',
  initialState,
  reducers: {
    setLlms: (state, action: PayloadAction<LlmRecord[]>) => {
      state.items = action.payload
      return state
    },
    upsertLlms: (state, action: PayloadAction<LlmRecord[]>) => {
      const llmsById = new Map(
        state.items.map((llm) => [ llm.id, llm ]),
      )

      for (const llm of action.payload) {
        llmsById.set(llm.id, llm)
      }

      state.items = Array.from(llmsById.values())
      return state
    },
    removeLlm: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((llm) => llm.id !== action.payload)
      return state
    },
    removeLlms: (state, action: PayloadAction<LlmRecord[]>) => {
      const llmIds = new Set(action.payload.map((llm) => llm.id))
      state.items = state.items.filter((llm) => !llmIds.has(llm.id))
      return state
    },
  },
})

export const llmActions = slice.actions
