// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'

export type CreateTaskResult =
  | {
    status: 'error'
    error: string
    httpStatus: number
  }
  | {
    status: 'created'
    task: Task
  }

export type DeleteTaskResult =
  | {
    status: 'error'
    error: string
    httpStatus: number
  }
  | {
    status: 'deleted'
    taskId: string
  }
