// Copyright © 2026 Jalapeno Labs

import type { WorkspaceWithEnv } from '@common/types'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

type State = {
  items: WorkspaceWithEnv[]
}

const initialState: State = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    setWorkspaces: (state, action: PayloadAction<WorkspaceWithEnv[]>) => {
      state.items = action.payload
    },
    upsertWorkspace: (state, action: PayloadAction<WorkspaceWithEnv>) => {
      const asRecord = Object.fromEntries(state.items.map((item) => [ item.id, item ]))
      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
    },
    removeWorkspace: (state, action: PayloadAction<WorkspaceWithEnv>) => {
      state.items = state.items.filter((workspace) => workspace.id !== action.payload.id)
    },
  },
})

export const workspaceActions = slice.actions
