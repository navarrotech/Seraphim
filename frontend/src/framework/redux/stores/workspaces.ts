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
    },
    upsertWorkspace: (state, action: PayloadAction<Workspace>) => {
      const asRecord = Object.fromEntries(state.items.map((item) => [ item.id, item ]))
      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
    },
    removeWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.items = state.items.filter((workspace) => workspace.id !== action.payload.id)
    },
  },
})

export const workspaceActions = slice.actions
