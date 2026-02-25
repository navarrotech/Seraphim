// Copyright © 2026 Jalapeno Labs

import type { AuthAccount } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'
import { isEqual } from 'lodash-es'

type State = {
  items: AuthAccount[]
}

const initialState: State = {
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

      if (isEqual(asRecord[action.payload.id], action.payload)) {
        return
      }

      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
    },
    removeAccount: (state, action: PayloadAction<AuthAccount>) => {
      state.items = state.items.filter((account) => account.id !== action.payload.id)
    },
  },
})

export const accountActions = slice.actions
