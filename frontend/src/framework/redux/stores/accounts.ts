// Copyright © 2026 Jalapeno Labs

import type { AuthAccount } from '@prisma/client'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type AccountsState = {
  items: AuthAccount[]
}

const initialState: AccountsState = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setAccounts: (state, action: PayloadAction<AuthAccount[]>) => {
      state.items = action.payload
    },
    upsertAccount: (state, action: PayloadAction<AuthAccount>) => {
      const asRecord = Object.fromEntries(state.items.map((item) => [ item.id, item ]))
      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
    },
    removeAccount: (state, action: PayloadAction<{ id: string }>) => {
      state.items = state.items.filter((account) => account.id !== action.payload.id)
    },
  },
})

export const accountActions = slice.actions
