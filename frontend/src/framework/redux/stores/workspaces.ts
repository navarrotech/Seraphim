// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type WorkspacesState = {
  items: Workspace[]
}

const initialState: WorkspacesState = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.items = action.payload
      return state
    },
    removeWorkspace: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((workspace) => workspace.id !== action.payload)
      return state
    },
  },
})

export const workspaceActions = slice.actions
