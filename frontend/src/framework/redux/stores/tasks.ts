// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type TasksState = {
  items: Task[]
}

const initialState: TasksState = {
  items: [],
} as const

export const slice = createEnhancedSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.items = action.payload
      return state
    },
    upsertTasks: (state, action: PayloadAction<Task[]>) => {
      const tasksById = new Map(state.items.map((task) => [ task.id, task ]))

      for (const task of action.payload) {
        tasksById.set(task.id, task)
      }

      state.items = Array.from(tasksById.values())
      return state
    },
    removeTasks: (state, action: PayloadAction<Task[]>) => {
      const taskIds = new Set(action.payload.map((task) => task.id))
      state.items = state.items.filter((task) => !taskIds.has(task.id))
      return state
    },
  },
})

export const taskActions = slice.actions
