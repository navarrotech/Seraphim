// Copyright © 2026 Jalapeno Labs

import type { Task, LlmUsage } from '@common/types'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

type State = {
  items: Task[]
  usageByTaskId: Record<string, LlmUsage | null>
}

const initialState: State = {
  items: [],
  usageByTaskId: {},
} as const

export const slice = createEnhancedSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      const filtered = action.payload.filter((task) => !task.archived)
      state.items = filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    },
    upsertTask: (state, action: PayloadAction<Task>) => {
      const asRecord = Object.fromEntries(state.items.map((item) => [ item.id, item ]))
      asRecord[action.payload.id] = action.payload
      const updatedItems = Object.values(asRecord)
      state.items = updatedItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    },
    removeTask: (state, action: PayloadAction<Task>) => {
      state.items = state.items.filter((task) => task.id !== action.payload.id)
      delete state.usageByTaskId[action.payload.id]
    },
    upsertTaskUsage: (state, action: PayloadAction<LlmUsage>) => {
      const id = action.payload.taskId
      state.usageByTaskId[id] = action.payload
    },
  },
})

export const taskActions = slice.actions
