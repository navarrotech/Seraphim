// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'
import type { TaskCreateRequest } from '@common/schema'
import type { WorkspaceWithEnv } from '@common/types'

// Utility
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { requestTaskName, toContainerName } from '@electron/jobs/taskNaming'
import { teardownTask } from '@electron/jobs/teardownTask'

// Misc
import { TaskInstance } from './taskInstance'

type TaskLaunchContext = {
  workspace: WorkspaceWithEnv
  repository: string
  githubTokens: string[]
}

type CreateTaskResult =
  | {
    status: 'error'
    error: string
    httpStatus: number
  }
  | {
    status: 'created'
    task: Task
    launchContext: TaskLaunchContext
  }

type DeleteTaskResult =
  | {
    status: 'error'
    error: string
    httpStatus: number
  }
  | {
    status: 'deleted'
    taskId: string
  }

class TaskManager {
  private taskInstances = new Map<string, TaskInstance>()

  getTask(taskId: string): TaskInstance | null {
    const trimmedTaskId = taskId?.trim()
    if (!trimmedTaskId) {
      console.debug('TaskManager getTask called with empty taskId', { taskId })
      return null
    }

    return this.taskInstances.get(trimmedTaskId) ?? null
  }

  async initializeFromDatabase(): Promise<void> {
    const databaseClient = requireDatabaseClient('TaskManager initialize')
    const tasks = await databaseClient.task.findMany()

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
      await taskInstance.refreshContainerStatus()
    }
  }

  async createTask(request: TaskCreateRequest): Promise<CreateTaskResult> {
    const databaseClient = requireDatabaseClient('TaskManager createTask')

    const workspace = await databaseClient.workspace.findUnique({
      where: { id: request.workspaceId },
      include: { envEntries: true },
    })

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

    const repository = workspace.repository?.trim()
    if (!repository) {
      console.debug('Task creation failed, workspace missing repository', {
        workspaceId: request.workspaceId,
      })
      return {
        status: 'error',
        error: 'Workspace repository is required',
        httpStatus: 400,
      }
    }

    const llm = await databaseClient.llm.findUnique({
      where: { id: request.llmId },
    })

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

    const codexTaskName = await requestTaskName(llm, {
      message: request.message,
      workspaceName: workspace.name,
    })
    if (!codexTaskName) {
      return {
        status: 'error',
        error: 'Codex authentication is not configured correctly',
        httpStatus: 400,
      }
    }

    const resolvedContainerName = toContainerName(codexTaskName)
    const githubTokens = await fetchGithubTokens(databaseClient)
    const createdTask = await databaseClient.task.create({
      data: {
        userId: request.userId,
        workspaceId: request.workspaceId,
        llmId: request.llmId,
        name: codexTaskName,
        branch: request.branch,
        container: 'pending',
        containerName: resolvedContainerName,
        archived: request.archived,
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
      launchContext: {
        workspace,
        repository,
        githubTokens,
      },
    }
  }

  async launchTask(taskId: string, context: TaskLaunchContext): Promise<void> {
    const taskInstance = this.taskInstances.get(taskId)
    if (!taskInstance) {
      console.debug('TaskManager launch requested without task instance', {
        taskId,
      })
      return
    }

    try {
      const updatedTask = await taskInstance.launch(
        context.workspace,
        context.repository,
        context.githubTokens,
      )

      broadcastSseChange({
        type: 'update',
        kind: 'tasks',
        data: [ updatedTask ],
      })
    }
    catch (error) {
      console.error('Failed to provision task container', error)
    }
  }

  async deleteTask(taskId: string): Promise<DeleteTaskResult> {
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
      await taskInstance.deleteFromDatabase()
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

let taskManager: TaskManager | null = null

export function getTaskManager(): TaskManager {
  if (!taskManager) {
    taskManager = new TaskManager()
  }

  return taskManager
}

async function fetchGithubTokens(
  databaseClient: ReturnType<typeof requireDatabaseClient>,
) {
  const authAccounts = await databaseClient.authAccount.findMany({
    where: {
      provider: 'GITHUB',
    },
  })

  return authAccounts
    .map((account) => account.accessToken)
    .filter((token): token is string => Boolean(token?.trim()))
}
