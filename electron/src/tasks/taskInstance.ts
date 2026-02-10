// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'
import type { WorkspaceWithEnv } from '@common/types'

// Core
import { EventEmitter } from 'node:events'
import { createInterface } from 'node:readline'
import { PassThrough } from 'node:stream'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { getDockerClient } from '@electron/docker/docker'
import { launchTask } from '@electron/jobs/launchTask'
import { teardownTask } from '@electron/jobs/teardownTask'

type TaskInstanceOptions = {
  task: Task
  containerExists: boolean
}

export class TaskInstance extends EventEmitter {
  private task: Task
  private containerExists: boolean
  private ioStream: NodeJS.ReadWriteStream | null = null
  private stdoutStream: PassThrough | null = null
  private stderrStream: PassThrough | null = null
  private isAttached = false

  constructor(options: TaskInstanceOptions) {
    super()
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
    await this.attachToContainer()

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

  async attachToContainer(): Promise<void> {
    if (this.isAttached) {
      console.debug('TaskInstance attach requested but already attached', {
        taskId: this.task.id,
      })
      return
    }

    const containerId = this.task.container?.trim()
    if (!containerId) {
      console.debug('TaskInstance attach requested without container id', {
        taskId: this.task.id,
      })
      return
    }

    const dockerClient = getDockerClient()
    if (!dockerClient) {
      console.debug('TaskInstance attach requested without docker client', {
        taskId: this.task.id,
        containerId,
      })
      return
    }

    const container = dockerClient.getContainer(containerId)
    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
    })

    const stdoutStream = new PassThrough()
    const stderrStream = new PassThrough()

    dockerClient.modem.demuxStream(stream, stdoutStream, stderrStream)

    this.ioStream = stream
    this.stdoutStream = stdoutStream
    this.stderrStream = stderrStream
    this.isAttached = true

    const stdoutReader = createInterface({ input: stdoutStream })
    stdoutReader.on('line', handleStdoutLine.bind(this))

    stdoutStream.on('data', handleStdoutData.bind(this))
    stderrStream.on('data', handleStderrData.bind(this))
    stream.on('error', handleStreamError.bind(this))

    function handleStdoutLine(this: TaskInstance, line: string) {
      this.emit('stdoutLine', line)
      this.emit('line', line)

      const parsedMessage = safeParseJson(line)
      if (parsedMessage) {
        this.emit('message', parsedMessage)
      }
    }

    function handleStdoutData(this: TaskInstance, chunk: Buffer) {
      this.emit('stdout', chunk)
      this.emit('data', chunk)
    }

    function handleStderrData(this: TaskInstance, chunk: Buffer) {
      this.emit('stderr', chunk)
      this.emit('data', chunk)
    }

    function handleStreamError(this: TaskInstance, error: Error) {
      console.error('TaskInstance stream error', {
        taskId: this.task.id,
        containerId,
        error,
      })
    }
  }

  sendMessage(message: unknown): void {
    if (!this.ioStream) {
      console.debug('TaskInstance sendMessage requested without stream', {
        taskId: this.task.id,
      })
      return
    }

    const payload = `${JSON.stringify(message)}\n`
    this.ioStream.write(payload)
  }

  sendRawInput(value: string): void {
    if (!this.ioStream) {
      console.debug('TaskInstance sendRawInput requested without stream', {
        taskId: this.task.id,
      })
      return
    }

    this.ioStream.write(value)
  }
}

export interface TaskInstance {
  on(event: 'stdout', listener: (chunk: Buffer) => void): this
  on(event: 'stderr', listener: (chunk: Buffer) => void): this
  on(event: 'data', listener: (chunk: Buffer) => void): this
  on(event: 'stdoutLine', listener: (line: string) => void): this
  on(event: 'line', listener: (line: string) => void): this
  on(event: 'message', listener: (message: unknown) => void): this
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

function safeParseJson(line: string): unknown | null {
  const trimmedLine = line.trim()
  if (!trimmedLine) {
    return null
  }

  const startsWithJson = trimmedLine.startsWith('{') || trimmedLine.startsWith('[')
  if (!startsWithJson) {
    return null
  }

  try {
    return JSON.parse(trimmedLine)
  }
  catch (error) {
    console.debug('TaskInstance failed to parse stdout line as JSON', {
      line: trimmedLine,
      error,
    })
    return null
  }
}
