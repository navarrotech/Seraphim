// Copyright © 2026 Jalapeno Labs

import type { ConnectedAccount } from '@frontend/lib/routes/accountsRoutes'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type AccountsState = {
  items: ConnectedAccount[]
}

const initialState: AccountsState = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setAccounts: (state, action: PayloadAction<ConnectedAccount[]>) => {
      state.items = action.payload
      return state
    },
    upsertAccounts: (state, action: PayloadAction<ConnectedAccount[]>) => {
      const accountsById = new Map(
        state.items.map((account) => [ account.id, account ]),
      )

      for (const account of action.payload) {
        accountsById.set(account.id, account)
      }

      state.items = Array.from(accountsById.values())
      return state
    },
    removeAccount: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((account) => account.id !== action.payload)
      return state
    },
    removeAccounts: (state, action: PayloadAction<ConnectedAccount[]>) => {
      const accountIds = new Set(action.payload.map((account) => account.id))
      state.items = state.items.filter((account) => !accountIds.has(account.id))
      return state
    },
  },
})

export const accountActions = slice.actions
