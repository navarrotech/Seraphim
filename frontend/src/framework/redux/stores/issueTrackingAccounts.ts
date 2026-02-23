// Copyright © 2026 Jalapeno Labs

import type { IssueTrackingAccount } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

type State = {
  items: IssueTrackingAccount[]
}

const initialState: State = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'issueTrackingAccounts',
  initialState,
  reducers: {
    setIssueTrackingAccounts: (state, action: PayloadAction<IssueTrackingAccount[]>) => {
      state.items = action.payload
    },
    upsertIssueTrackingAccount: (state, action: PayloadAction<IssueTrackingAccount>) => {
      const asRecord = Object.fromEntries(
        state.items.map((item) => [ item.id, item ]),
      )
      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
    },
    removeIssueTrackingAccount: (state, action: PayloadAction<IssueTrackingAccount>) => {
      state.items = state.items.filter((account) => account.id !== action.payload.id)
    },
  },
})

export const issueTrackingAccountActions = slice.actions
