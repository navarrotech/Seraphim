// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'
import type { TaskState } from '@prisma/client'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'

export async function updateTaskState(
  taskId: string,
  newState: TaskState,
): Promise<Task | null> {
  const trimmedTaskId = taskId?.trim()
  const databaseClient = requireDatabaseClient('Update task state job')

  try {
    const existingTask = await databaseClient.task.findUnique({
      where: { id: trimmedTaskId },
    })

    if (!existingTask) {
      console.debug('updateTaskState task not found', { taskId: trimmedTaskId })
      return null
    }

    const updatedTask = await databaseClient.task.update({
      where: { id: trimmedTaskId },
      data: {
        state: newState,
      },
    })

    broadcastSseChange({
      type: 'update',
      kind: 'tasks',
      data: [ updatedTask ],
    })

    return updatedTask
  }
  catch (error) {
    console.error('updateTaskState failed to update task state', { taskId: trimmedTaskId, error })
    return null
  }
}
