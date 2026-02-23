// Copyright © 2026 Jalapeno Labs

import type { UserSettings } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

type State = {
  value: UserSettings | null
  hasLoaded: boolean
}

const initialState: State = {
  value: null,
  hasLoaded: false,
} as const

export const slice = createEnhancedSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<UserSettings | null>) => {
      state.value = action.payload
      state.hasLoaded = true
    },
  },
})

export const settingsActions = slice.actions
