// Copyright © 2026 Jalapeno Labs

import type { ConnectionRecord } from '@frontend/lib/types/connectionTypes'
import type { PayloadAction } from '@reduxjs/toolkit'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

export type ConnectionsState = {
  items: ConnectionRecord[]
}

const initialState: ConnectionsState = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'connections',
  initialState,
  reducers: {
    setConnections: (state, action: PayloadAction<ConnectionRecord[]>) => {
      state.items = action.payload
      return state
    },
    upsertConnections: (state, action: PayloadAction<ConnectionRecord[]>) => {
      const connectionsById = new Map(
        state.items.map((connection) => [ connection.id, connection ]),
      )

      for (const connection of action.payload) {
        connectionsById.set(connection.id, connection)
      }

      state.items = Array.from(connectionsById.values())
      return state
    },
    removeConnection: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((connection) => connection.id !== action.payload)
      return state
    },
    removeConnections: (state, action: PayloadAction<ConnectionRecord[]>) => {
      const connectionIds = new Set(action.payload.map((connection) => connection.id))
      state.items = state.items.filter((connection) => !connectionIds.has(connection.id))
      return state
    },
  },
})

export const connectionActions = slice.actions
