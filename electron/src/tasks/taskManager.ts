// Copyright © 2026 Jalapeno Labs

import type { TaskCreateRequest } from '@common/schema'
import type { ArchiveTaskResult, CreateTaskResult, DeleteTaskResult } from './types'

// Utility
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { requestTaskName, toContainerName } from '@electron/jobs/taskNaming'
import { teardownTask } from '@electron/jobs/teardownTask'

// Misc
import { TaskInstance } from './taskInstance'
class TaskManager {
  private taskInstances = new Map<string, TaskInstance>()

  public getTask(taskId: string): TaskInstance | null {
    const trimmedTaskId = taskId?.trim()
    if (!trimmedTaskId) {
      console.debug('TaskManager getTask called with empty taskId', { taskId })
      return null
    }

    return this.taskInstances.get(trimmedTaskId) ?? null
  }

  public async initializeFromDatabase(): Promise<void> {
    const databaseClient = requireDatabaseClient('TaskManager initialize')
    const tasks = await databaseClient.task.findMany({
      where: { archived: false },
      include: {
        llm: true,
        authAccount: true,
        messages: true,
        user: true,
        workspace: {
          include: {
            envEntries: true,
          },
        },
      },
    })

    for (const task of tasks) {
      if (this.taskInstances.has(task.id)) {
        console.debug('TaskManager skipped duplicate task initialization', {
          taskId: task.id,
        })
        continue
      }

      const taskInstance = new TaskInstance({
        task,
        containerExists: false,
      })

      this.taskInstances.set(task.id, taskInstance)
      const containerExists = await taskInstance.refreshContainerStatus()
      if (containerExists) {
        await taskInstance.attachToContainer()
      }
    }
  }

  public async createTask(request: TaskCreateRequest): Promise<CreateTaskResult> {
    const databaseClient = requireDatabaseClient('TaskManager createTask')

    const [ workspace, llm ] = await Promise.all([
      databaseClient.workspace.findUnique({
        where: {
          id: request.workspaceId,
        },
        include: {
          envEntries: true,
        },
      }),
      databaseClient.llm.findUnique({
        where: {
          id: request.llmId,
        },
      }),
    ])

    if (!workspace) {
      console.debug('Task creation failed, workspace not found', {
        workspaceId: request.workspaceId,
      })
      return {
        status: 'error',
        error: 'Workspace not found',
        httpStatus: 404,
      }
    }

    if (!llm) {
      console.debug('Task creation failed, llm not found', {
        llmId: request.llmId,
      })
      return {
        status: 'error',
        error: 'Llm not found',
        httpStatus: 404,
      }
    }

    if (!workspace.sourceRepoUrl?.trim()) {
      console.debug('Task creation failed, workspace missing source repo URL', {
        workspaceId: request.workspaceId,
      })
      return {
        status: 'error',
        error: 'Workspace source repository is required',
        httpStatus: 400,
      }
    }

    const codexTaskName = await requestTaskName(llm, request.message)

    if (!codexTaskName) {
      return {
        status: 'error',
        error: 'Codex authentication is not configured correctly',
        httpStatus: 400,
      }
    }

    const resolvedContainerName = toContainerName(codexTaskName)

    const createdTask = await databaseClient.task.create({
      data: {
        userId: request.userId,
        workspaceId: request.workspaceId,
        llmId: request.llmId,
        authAccountId: request.authAccountId,
        name: codexTaskName,
        sourceGitBranch: request.branch,
        container: 'pending',
        containerName: resolvedContainerName,
        archived: request.archived,
      },
      include: {
        llm: true,
        messages: true,
        authAccount: true,
        user: true,
        workspace: {
          include: {
            envEntries: true,
          },
        },
      },
    })

    const taskInstance = new TaskInstance({
      task: createdTask,
      containerExists: false,
    })

    this.taskInstances.set(createdTask.id, taskInstance)

    broadcastSseChange({
      type: 'create',
      kind: 'tasks',
      data: [ createdTask ],
    })

    return {
      status: 'created',
      task: createdTask,
    }
  }

  public async launchTask(taskId: string): Promise<void> {
    const taskInstance = this.taskInstances.get(taskId)
    if (!taskInstance) {
      console.debug('TaskManager launch requested without task instance', {
        taskId,
      })
      return
    }

    try {
      const updatedTask = await taskInstance.createContainer()

      broadcastSseChange({
        type: 'update',
        kind: 'tasks',
        data: [ updatedTask.data ],
      })
    }
    catch (error) {
      console.error('Failed to provision task container', error)
    }
  }


  public async archiveTask(taskId: string): Promise<ArchiveTaskResult> {
    const trimmedTaskId = taskId?.trim()
    if (!trimmedTaskId) {
      console.debug('Task archive requested without taskId', { taskId })
      return {
        status: 'error',
        error: 'Task ID is required',
        httpStatus: 400,
      }
    }

    const databaseClient = requireDatabaseClient('TaskManager archiveTask')
    const existingTask = await databaseClient.task.findUnique({
      where: { id: trimmedTaskId },
    })

    if (!existingTask) {
      console.debug('Task archive failed, task not found', {
        taskId: trimmedTaskId,
      })
      return {
        status: 'error',
        error: 'Task not found',
        httpStatus: 404,
      }
    }

    if (existingTask.archived) {
      console.debug('Task archive requested for task that is already archived', {
        taskId: trimmedTaskId,
      })
      return {
        status: 'archived',
        taskId: trimmedTaskId,
      }
    }

    const archivedTask = await databaseClient.task.update({
      where: { id: trimmedTaskId },
      data: { archived: true },
    })

    const taskInstance = this.taskInstances.get(trimmedTaskId)
    if (taskInstance) {
      await taskInstance.teardown()
      this.taskInstances.delete(trimmedTaskId)
    }
    else {
      console.debug('Task archive requested without task instance', {
        taskId: trimmedTaskId,
      })
      await teardownTask(existingTask.container)
    }

    broadcastSseChange({
      type: 'update',
      kind: 'tasks',
      data: [ archivedTask ],
    })

    return {
      status: 'archived',
      taskId: trimmedTaskId,
    }
  }

  public async deleteTask(taskId: string): Promise<DeleteTaskResult> {
    const trimmedTaskId = taskId?.trim()
    if (!trimmedTaskId) {
      console.debug('Task delete requested without taskId', { taskId })
      return {
        status: 'error',
        error: 'Task ID is required',
        httpStatus: 400,
      }
    }

    const databaseClient = requireDatabaseClient('TaskManager deleteTask')
    const existingTask = await databaseClient.task.findUnique({
      where: { id: trimmedTaskId },
    })

    if (!existingTask) {
      console.debug('Task delete failed, task not found', {
        taskId: trimmedTaskId,
      })
      return {
        status: 'error',
        error: 'Task not found',
        httpStatus: 404,
      }
    }

    const taskInstance = this.taskInstances.get(trimmedTaskId)
    if (taskInstance) {
      await taskInstance.teardown()
    }
    else {
      console.debug('Task delete requested without task instance', {
        taskId: trimmedTaskId,
      })
      await teardownTask(existingTask.container)
      await databaseClient.task.delete({
        where: { id: trimmedTaskId },
      })
    }

    this.taskInstances.delete(trimmedTaskId)

    broadcastSseChange({
      type: 'delete',
      kind: 'tasks',
      data: [ existingTask ],
    })

    return {
      status: 'deleted',
      taskId: trimmedTaskId,
    }
  }
}

const taskManager: TaskManager = new TaskManager()
export function getTaskManager(): TaskManager {
  return taskManager
}
