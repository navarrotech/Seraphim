// Copyright © 2026 Jalapeno Labs

import type { UserSettings } from '@common/types'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type SettingsState = {
  value: UserSettings | null
  hasLoaded: boolean
}

const initialState: SettingsState = {
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
