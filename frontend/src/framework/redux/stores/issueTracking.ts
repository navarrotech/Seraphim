// Copyright © 2026 Jalapeno Labs

import type { IssueTracking } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

type State = {
  items: IssueTracking[]
}

const initialState: State = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'issueTracking',
  initialState,
  reducers: {
    setIssueTracking: (state, action: PayloadAction<IssueTracking[]>) => {
      state.items = action.payload
    },
    upsertIssueTracking: (state, action: PayloadAction<IssueTracking>) => {
      const asRecord = Object.fromEntries(
        state.items.map((item) => [ item.id, item ]),
      )
      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
    },
    removeIssueTracking: (state, action: PayloadAction<IssueTracking>) => {
      state.items = state.items.filter((account) => account.id !== action.payload.id)
    },
  },
})

export const issueTrackingActions = slice.actions
