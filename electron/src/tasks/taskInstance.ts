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
import { safeParseJson } from '@common/json'

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
      sourceRepoUrl,
    } = this.task

    const cloner = getCloner(
      authAccount.provider,
      sourceRepoUrl,
      authAccount.accessToken,
    )

    const canClone = await cloner.checkIfCanClone()

    if (!canClone) {
      console.error('Cannot clone repository with provided URL and credentials', {
        repository: sourceRepoUrl,
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

    const container = await dockerClient.createContainer({
      name: this.task.containerName,
      Image,
      Env,
      HostConfig: {
        Binds: volumes,
      },
    })

    this.task.container = container.id
    this.containerExists = true

    await container.start()

    //   containerId = container.id

    //   const didSetupComplete = setupScriptName
    //     ? await waitForSetupScriptCompletion(container, taskId)
    //     : true

    //   if (!didSetupComplete) {
    //     console.debug('Setup script failed before completion marker', {
    //       taskId,
    //       containerId,
    //     })

    //     const failedState: TaskState = 'Failed'
    //     await updateTaskState(taskId, failedState)
    //     throw new Error('Setup script failed before completion marker')
    //   }

    //   const workingState: TaskState = 'Working'
    //   await updateTaskState(taskId, workingState)

    //   return {
    //     containerId,
    //     containerName: resolvedContainerName,
    //     imageTag: buildTag,
    //     usingToken: cloneResolution.usingToken,
    //   } as const
    // }
    // catch (error) {
    //   try {
    //     const failedState: TaskState = 'Failed'
    //     await updateTaskState(taskId, failedState)
    //   }
    //   catch (stateError) {
    //     console.debug('Failed to update task state after launch error', {
    //       taskId,
    //       stateError,
    //     })
    //   }

    //   if (containerId) {
    //     await teardownTask(containerId)
    //   }
    //   throw error
    // }
    // finally {
    //   try {
    //     await rm(contextDir, { recursive: true, force: true })
    //   }
    //   catch (cleanupError) {
    //     console.debug('Failed to remove task build context', {
    //       contextDir,
    //       cleanupError,
    //     })
    //   }
    // }


    // /////////////////////////////////////////

    // const launchResult = await launchTask(
    //   workspace,
    //   repository,
    //   githubTokens,
    //   this.task.id,
    //   this.task.containerName ?? undefined,
    // )

    // const databaseClient = requireDatabaseClient('TaskInstance launch')
    // const updatedTask = await databaseClient.task.update({
    //   where: { id: this.task.id },
    //   data: {
    //     container: launchResult.containerId,
    //     containerName: launchResult.containerName,
    //   },
    // })

    // this.task = updatedTask
    // this.containerExists = true
    // await this.attachToContainer()

    // return updatedTask

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
}
