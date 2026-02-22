// Copyright © 2026 Jalapeno Labs

import type { Task, LlmUsage } from '@common/types'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type TasksState = {
  items: Task[]
  usageByTaskId: Record<string, LlmUsage | null>
}

const initialState: TasksState = {
  items: [],
  usageByTaskId: {},
} as const

export const slice = createEnhancedSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.items = action.payload.filter((task) => !task.archived)
    },
    upsertTask: (state, action: PayloadAction<Task>) => {
      const asRecord = Object.fromEntries(state.items.map((item) => [ item.id, item ]))
      asRecord[action.payload.id] = action.payload
      state.items = Object.values(asRecord)
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
