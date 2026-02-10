// Copyright © 2026 Jalapeno Labs

import type { TaskWithFullContext } from '@common/types'

// Core
import { requireDatabaseClient } from '@electron/database'

// Docker
import { getDockerClient } from '@electron/docker/docker'
import { getDockerSocketMount } from '@electron/docker/dockerSocket'
import { teardownTask } from '@electron/jobs/teardownTask'
import { buildImage } from '@electron/docker/buildImage'
import { getCloner } from '@common/cloning/getCloner'

// Node.js
import { EventEmitter } from 'node:events'
import { createInterface } from 'node:readline'
import { PassThrough } from 'node:stream'

// Utility
import { convertEnvironmentToStringArray } from '@common/envKit'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { safeParseJson } from '@common/json'
import { updateTaskState } from '@electron/jobs/updateTaskState'

type TaskInstanceOptions = {
  task: TaskWithFullContext
  containerExists: boolean
}

type EventMap = {
  'stdout': [ Buffer ]
  'stderr': [ Buffer ]
  'data': [ Buffer ]
  'line': [ string ]
  'message': [ unknown ]
}

type ExecuteCommandResult = {
  command: string
  stdout: string
  stderr: string
  exitCode: number
}

export class TaskInstance extends EventEmitter<EventMap> {
  private task: TaskWithFullContext
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

  get containerId(): string | null {
    const containerId = this.task.container?.trim()
    if (!containerId) {
      console.debug('TaskInstance container id not found', {
        taskId: this.task.id,
        containerId,
      })
      return null
    }

    return containerId
  }

  get hasContainer() {
    return this.containerExists
  }

  public async refreshContainerStatus(): Promise<boolean> {
    const containerId = this.containerId
    if (!containerId) {
      console.debug('TaskInstance missing container id during refresh', {
        taskId: this.task.id,
        containerId,
      })
      this.containerExists = false
      return false
    }

    try {
      const dockerClient = getDockerClient()
      const container = dockerClient.getContainer(containerId)
      await container.inspect()

      this.containerExists = true
      return true
    }
    catch (error) {
      console.debug('Container existence check failed', {
        containerId,
        error,
      })

      this.containerExists = false
      return false
    }
  }

  public async createContainer(): Promise<this> {
    try {
      const dockerClient = getDockerClient()
      if (!dockerClient) {
        throw new Error('Docker client is not available')
      }

      const {
        // llm,
        workspace,
        authAccount,
        // messages,
        // user,
      } = this.task

      const sourceRepoUrl = workspace.sourceRepoUrl?.trim()
      if (!sourceRepoUrl) {
        console.debug('TaskInstance missing workspace source repo URL', {
          taskId: this.task.id,
          workspaceId: workspace.id,
        })
        throw new Error('Workspace source repository is required')
      }

      await updateTaskState(this.task.id, 'Creating')

      const cloner = getCloner(
        authAccount.provider,
        sourceRepoUrl,
        authAccount.accessToken,
      )

      const canClone = await cloner.checkIfCanClone()

      if (!canClone) {
        console.error('Cannot clone repository with provided URL and credentials', {
          repository: workspace.sourceRepoUrl,
          authProvider: authAccount.provider,
        })
        throw new Error('Cannot clone repository with provided URL and credentials')
      }

      const buildImageResult = await buildImage(
        workspace,
        this.task,
        cloner,
      )

      if (!buildImageResult.success) {
        console.error('Image build failed', {
          errors: buildImageResult.errors,
        })
        throw new Error(`Image build failed: ${buildImageResult.errors?.join('; ')}`)
      }

      const Image = buildImageResult.imageTag
      const Env = convertEnvironmentToStringArray(workspace.envEntries)

      const socketMount = getDockerSocketMount()
      const volumes = []
      if (socketMount) {
        volumes.push(`${socketMount.source}:${socketMount.target}`)
      }

      console.debug('Creating Docker container for task')

      const container = await dockerClient.createContainer({
        name: this.task.containerName,
        Image,
        Env,
        HostConfig: {
          Binds: volumes,
        },
      })

      console.debug('Docker container created for task', {
        containerId: container.id,
        containerName: this.task.containerName,
        taskId: this.task.id,
      })

      const databaseClient = requireDatabaseClient('TaskInstance create container')
      const updatedTask = await databaseClient.task.update({
        where: { id: this.task.id },
        data: {
          container: container.id,
          state: 'SettingUp',
        },
      })

      this.task.container = container.id

      broadcastSseChange({
        kind: 'tasks',
        type: 'update',
        data: [ updatedTask ],
      })

      this.containerExists = true

      console.debug('Starting Docker container for task')

      await container.start()
      await this.attachToContainer()

      console.debug('Beginning task codex work...')

      await updateTaskState(this.task.id, 'Working')
    }
    catch (error) {
      console.log('TaskInstance createContainer failed', {
        taskId: this.task.id,
        error,
      })
      await updateTaskState(this.task.id, 'Failed')
    }

    return this
  }

  public async teardown(): Promise<void> {
    try {
      await teardownTask(this.task.container)
    }
    catch (error) {
      console.error(error)
    }
    finally {
      const databaseClient = requireDatabaseClient('TaskInstance delete')
      await databaseClient.task.delete({
        where: { id: this.task.id },
      })
    }
  }

  public async attachToContainer(): Promise<void> {
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

    const stdoutReader = createInterface({
      input: stdoutStream,
    })

    function handleStdoutLine(this: TaskInstance, line: string) {
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

    stdoutReader.on('line', handleStdoutLine.bind(this))
    stdoutStream.on('data', handleStdoutData.bind(this))
    stderrStream.on('data', handleStderrData.bind(this))
    stream.on('error', handleStreamError.bind(this))
  }

  public sendMessage(message: unknown): void {
    if (!this.ioStream) {
      console.debug('TaskInstance sendMessage requested without stream', {
        taskId: this.task.id,
      })
      return
    }

    const payload = `${JSON.stringify(message)}\n`
    this.ioStream.write(payload)
  }

  public async executeCmd(command: string): Promise<ExecuteCommandResult> {
    const containerId = this.containerId
    if (!containerId) {
      console.debug('TaskInstance executeCmd requested without container id', {
        taskId: this.task.id,
        command,
      })
      throw new Error('Cannot execute command without a container id')
    }

    const dockerClient = getDockerClient()
    if (!dockerClient) {
      console.debug('TaskInstance executeCmd requested without docker client', {
        taskId: this.task.id,
        containerId,
        command,
      })
      throw new Error('Docker client is not available')
    }

    const container = dockerClient.getContainer(containerId)
    const execInstance = await container.exec({
      AttachStdout: true,
      AttachStderr: true,
      Cmd: [ 'bash', '-lc', command ],
    })

    const stdoutStream = new PassThrough()
    const stderrStream = new PassThrough()
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    function handleStdoutData(chunk: Buffer) {
      stdoutChunks.push(chunk)
    }

    function handleStderrData(chunk: Buffer) {
      stderrChunks.push(chunk)
    }

    function handleStreamError(this: TaskInstance, error: Error) {
      console.debug('TaskInstance executeCmd stream error', {
        taskId: this.task.id,
        containerId,
        command,
        error,
      })
    }

    stdoutStream.on('data', handleStdoutData)
    stderrStream.on('data', handleStderrData)

    const executionStream = await execInstance.start({
      hijack: true,
      stdin: false,
    })

    executionStream.on('error', handleStreamError.bind(this))
    dockerClient.modem.demuxStream(executionStream, stdoutStream, stderrStream)

    await new Promise<void>((resolve, reject) => {
      function handleEnd() {
        resolve()
      }

      function handleError(error: Error) {
        reject(error)
      }

      executionStream.once('end', handleEnd)
      executionStream.once('error', handleError)
    })

    const inspectionResult = await execInstance.inspect()
    const exitCode = inspectionResult.ExitCode ?? -1
    const stdout = Buffer.concat(stdoutChunks).toString('utf8')
    const stderr = Buffer.concat(stderrChunks).toString('utf8')

    return {
      command,
      stdout,
      stderr,
      exitCode,
    }
  }
}
