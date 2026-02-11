// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'

export type TasksState = {
  items: Task[]
  archivedItems: Task[]
}

const initialState: TasksState = {
  items: [],
  archivedItems: [],
} as const

function splitTasksByArchived(tasks: Task[]) {
  const activeItems: Task[] = []
  const archivedItems: Task[] = []

  for (const task of tasks) {
    if (task.archived) {
      archivedItems.push(task)
      continue
    }

    activeItems.push(task)
  }

  return {
    activeItems,
    archivedItems,
  }
}

function upsertTaskMap(existingTasks: Task[], incomingTasks: Task[]) {
  const tasksById = new Map(existingTasks.map((task) => [ task.id, task ]))

  for (const task of incomingTasks) {
    tasksById.set(task.id, task)
  }

  return Array.from(tasksById.values())
}

export const slice = createEnhancedSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      const { activeItems, archivedItems } = splitTasksByArchived(action.payload)
      state.items = activeItems
      state.archivedItems = archivedItems
      return state
    },
    upsertTasks: (state, action: PayloadAction<Task[]>) => {
      const allTasks = upsertTaskMap(
        [ ...state.items, ...state.archivedItems ],
        action.payload,
      )
      const { activeItems, archivedItems } = splitTasksByArchived(allTasks)

      state.items = activeItems
      state.archivedItems = archivedItems
      return state
    },
    removeTasks: (state, action: PayloadAction<Task[]>) => {
      const taskIds = new Set(action.payload.map((task) => task.id))
      state.items = state.items.filter((task) => !taskIds.has(task.id))
      state.archivedItems = state.archivedItems.filter((task) => !taskIds.has(task.id))
      return state
    },
  },
})

export const taskActions = slice.actions
