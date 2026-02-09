// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'
import type { WorkspaceWithEnv } from '@common/types'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { getDockerClient } from '@electron/docker/docker'
import { launchTask } from '@electron/jobs/launchTask'
import { teardownTask } from '@electron/jobs/teardownTask'

type TaskInstanceOptions = {
  task: Task
  containerExists: boolean
}

export class TaskInstance {
  private task: Task
  private containerExists: boolean

  constructor(options: TaskInstanceOptions) {
    this.task = options.task
    this.containerExists = options.containerExists
  }

  get id() {
    return this.task.id
  }

  get data() {
    return this.task
  }

  get hasContainer() {
    return this.containerExists
  }

  updateFromDatabase(task: Task) {
    this.task = task
  }

  async refreshContainerStatus(): Promise<boolean> {
    const containerId = this.task.container?.trim()
    if (!containerId) {
      console.debug('TaskInstance missing container id during refresh', {
        taskId: this.task.id,
      })
      this.containerExists = false
      return false
    }

    const exists = await doesContainerExist(containerId)
    this.containerExists = exists

    if (!exists) {
      console.warn('TaskInstance container missing', {
        taskId: this.task.id,
        containerId,
      })
    }

    return exists
  }

  async launch(
    workspace: WorkspaceWithEnv,
    repository: string,
    githubTokens: string[],
  ): Promise<Task> {
    const launchResult = await launchTask(
      workspace,
      repository,
      githubTokens,
      this.task.id,
      this.task.containerName ?? undefined,
    )

    const databaseClient = requireDatabaseClient('TaskInstance launch')
    const updatedTask = await databaseClient.task.update({
      where: { id: this.task.id },
      data: {
        container: launchResult.containerId,
        containerName: launchResult.containerName,
      },
    })

    this.task = updatedTask
    this.containerExists = true

    return updatedTask
  }

  async teardown(): Promise<void> {
    await teardownTask(this.task.container)
  }

  async deleteFromDatabase(): Promise<void> {
    const databaseClient = requireDatabaseClient('TaskInstance delete')
    await databaseClient.task.delete({
      where: { id: this.task.id },
    })
  }
}

async function doesContainerExist(containerId: string): Promise<boolean> {
  const trimmedContainerId = containerId.trim()
  if (!trimmedContainerId) {
    console.debug('Container existence check called with empty id', {
      containerId,
    })
    return false
  }

  const dockerClient = getDockerClient()
  if (!dockerClient) {
    console.debug('Container existence check requested without docker client', {
      containerId: trimmedContainerId,
    })
    return false
  }

  try {
    const container = dockerClient.getContainer(trimmedContainerId)
    await container.inspect()
    return true
  }
  catch (error) {
    console.debug('Container existence check failed', {
      containerId: trimmedContainerId,
      error,
    })
    return false
  }
}
