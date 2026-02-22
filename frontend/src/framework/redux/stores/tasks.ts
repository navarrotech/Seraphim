// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'
import type { LlmUsage } from '@common/types'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type TasksState = {
  items: Task[]
  archivedItems: Task[]
  usageByTaskId: Record<string, LlmUsage | null>
}

const initialState: TasksState = {
  items: [],
  archivedItems: [],
  usageByTaskId: {},
} as const

export const slice = createEnhancedSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.items = action.payload.filter((task) => !task.archived)
      state.archivedItems = action.payload.filter((task) => task.archived)
    },
    upsertTask: (state, action: PayloadAction<Task>) => {
      if (action.payload.archived) {
        const asRecord = Object.fromEntries(state.archivedItems.map((item) => [ item.id, item ]))
        asRecord[action.payload.id] = action.payload
        state.archivedItems = Object.values(asRecord)
      }
      else {
        const asRecord = Object.fromEntries(state.items.map((item) => [ item.id, item ]))
        asRecord[action.payload.id] = action.payload
        state.items = Object.values(asRecord)
      }
    },
    removeTask: (state, action: PayloadAction<{ id: string }>) => {
      state.items = state.items.filter((task) => task.id !== action.payload.id)
      state.archivedItems = state.archivedItems.filter((task) => task.id !== action.payload.id)
      delete state.usageByTaskId[action.payload.id]
    },
    upsertTaskUsage: (state, action: PayloadAction<LlmUsage>) => {
      const id = action.payload.taskId
      state.usageByTaskId[id] = action.payload
    },
  },
})

export const taskActions = slice.actions
