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
  },
})

export const taskActions = slice.actions
