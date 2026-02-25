// Copyright © 2026 Jalapeno Labs

import type { UserSettings } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

type State = {
  current: UserSettings | null
}

const initialState: State = {
  current: null,
} as const

export const slice = createEnhancedSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<UserSettings | null>) => {
      state.current = action.payload
    },
  },
})

export const settingsActions = slice.actions
