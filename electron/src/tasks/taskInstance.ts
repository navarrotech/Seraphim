// Copyright © 2026 Jalapeno Labs

import type { Prisma } from '@prisma/client'
import type { TaskWithFullContext } from '@common/types'
import type { ClientRequest, ClientNotification } from '@electron/vendor/codex-protocol'

// Core
import { requireDatabaseClient } from '@electron/database'
import packageJson from '../../package.json'

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
import { CODEX_WORKDIR, SETUP_FAILURE_LINE, SETUP_SUCCESS_LINE } from '@common/constants'

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

type ThreadResponse = {
  id: string
}

export class TaskInstance extends EventEmitter<EventMap> {
  private task: TaskWithFullContext
  private containerExists: boolean
  private ioStream: NodeJS.ReadWriteStream | null = null
  private stdoutStream: PassThrough | null = null
  private stderrStream: PassThrough | null = null
  private isAttached = false
  private codexThreadId: string | null = null
  private nextRequestId: number = 1

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
        llm,
        workspace,
        authAccount,
        messages,
      } = this.task

      const initialMessage = messages?.[0]
      if (!initialMessage) {
        console.debug('TaskInstance missing initial message', {
          taskId: this.task.id,
          messages,
        })
        throw new Error('Initial message is required to create task container')
      }

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

      Env.push(`CODEX_HOME=${CODEX_WORKDIR}`)

      const socketMount = getDockerSocketMount()
      const volumes = []
      if (socketMount) {
        volumes.push(`${socketMount.source}:${socketMount.target}`)
      }

      console.debug('Creating Docker container for task')

      // const abortController = new AbortController()
      // const buildCompleteScriptPromise = this.waitForStdout(SETUP_SUCCESS_LINE, -1, abortController.signal)
      // const buildFailureScriptPromise = this.waitForStdout(SETUP_FAILURE_LINE, -1, abortController.signal)

      const container = await dockerClient.createContainer({
        name: this.task.containerName,
        Image,
        Env,
        HostConfig: {
          Binds: volumes,
          NetworkMode: 'host',
        },
        Cmd: [ 'codex', 'app-server' ],
        // The following are necessary for codex app-server to work properly
        Tty: false,
        OpenStdin: true,
        AttachStdin: true,
        StdinOnce: false,
        AttachStderr: true,
        AttachStdout: true,
      })

      console.debug('Docker container created for task', {
        containerId: container.id,
        containerName: this.task.containerName,
        taskId: this.task.id,
      })

      await this.updateSelf({
        container: container.id,
        state: 'SettingUp',
      })

      this.containerExists = true

      console.debug('Starting Docker container for task')

      await container.start()
      await this.attachToContainer()

      // // This only guarantees that the setup script has completed
      // // This does *NOT* guarantee that the `codex app-server` process has fully started.
      // // Typically it's started immediately AFTER this gets logged
      // const completed = await Promise.race([
      //   buildCompleteScriptPromise
      //     .then(() => ({ type: 'success' as const }))
      //     .catch((error) => ({ type: 'success-error' as const, error })),
      //   buildFailureScriptPromise
      //     .then(() => ({ type: 'failure' as const }))
      //     .catch((error) => ({ type: 'failure-error' as const, error })),
      // ])

      // if (completed.type !== 'success') {
      //   throw new Error(`Setup script did not complete successfully: ${completed.type}`)
      // }

      // TODO: A better way to await the `codex app-server` startup completion?
      // await new Promise((resolve) => setTimeout(resolve, 5_000))

      const initId = await this.getRequestId()
      const initPromise = this.waitForResponse(initId)
      this.sendMessage({
        method: 'initialize',
        id: initId,
        params: {
          clientInfo: {
            name: 'seraphim',
            title: 'Seraphim',
            version: packageJson.version,
          },
          capabilities: {
            experimentalApi: false,
          },
        },
      })
      await initPromise

      this.sendMessage({ method: 'initialized' })

      console.debug('Beginning task codex work...')

      const threadStartId = await this.getRequestId()
      this.sendMessage({
        method: 'thread/start',
        id: threadStartId,
        params: {
          experimentalRawEvents: false,
          model: llm.preferredModel,
        },
      })

      const threadResult = await this.waitForResponse<ThreadResponse>(threadStartId)

      console.debug('Received thread/start response from Codex', {
        threadId: threadResult.id,
      })

      // TODO: persist this to db! So it persists in between session restarts
      this.codexThreadId = threadResult.id

      await updateTaskState(this.task.id, 'Working')

      const turnStartId = await this.getRequestId()
      this.sendMessage({
        method: 'turn/start',
        id: turnStartId,
        params: {
          threadId: this.codexThreadId,
          input: [{
            type: 'text',
            text: initialMessage.content,
            text_elements: [],
          }],
        },
      })
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
      await databaseClient.$transaction(async (transaction) => {
        await transaction.message.deleteMany({
          where: { taskId: this.task.id },
        })

        await transaction.task.delete({
          where: { id: this.task.id },
        })
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

      const parsedMessage = safeParseJson(line, undefined, true)
      if (parsedMessage) {
        this.emit('message', parsedMessage)
        console.log(parsedMessage)
      }
      else if (line.startsWith('{')) {
        console.debug('Failed to parse task container stdout line as JSON', {
          taskId: this.task.id,
          line,
        })
      }
      else {
        console.info(line)
      }
    }

    function handleStdoutData(this: TaskInstance, chunk: Buffer) {
      this.emit('stdout', chunk)
      this.emit('data', chunk)
    }

    function handleStderrData(this: TaskInstance, chunk: Buffer) {
      this.emit('stderr', chunk)
      this.emit('data', chunk)
      console.debug('Container STDERR', chunk?.toString('utf-8'))
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

  public sendMessage(message: ClientRequest | ClientNotification): void {
    if (!this.ioStream) {
      console.debug('TaskInstance sendMessage requested without stream', {
        taskId: this.task.id,
      })
      return
    }

    let id: string = ''
    if ('id' in message) {
      id = ` (#${String(message.id)}) `
    }

    console.debug(`CODEX -> ${message.method}${id}`, message)
    const payload = `${JSON.stringify(message)}\n`
    this.ioStream.write(payload)
  }

  private async waitForResponse<Type = any>(id: number, timeoutMs = 180_000): Promise<Type> {
    return new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | undefined

      if (timeoutMs > 0) {
        timeout = setTimeout(() => {
          this.off('message', onMessage)
          reject(new Error(`Timeout waiting for response id=${id}`))
        }, timeoutMs)
      }

      const onMessage = (message: any) => {
        if (!message || typeof message !== 'object') {
          return
        }
        if (message.id !== id) {
          return
        }

        clearTimeout(timeout)
        this.off('message', onMessage)

        if (message.error) {
          reject(message.error)
        }
        else {
          resolve(message.result)
        }
      }

      this.on('message', onMessage)
    })
  }

  private async waitForStdout<Type = any>(
    line: string,
    timeoutMs = 30_000,
    signal?: AbortSignal,
  ): Promise<Type> {
    return new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | undefined

      if (timeoutMs > 0) {
        timeout = setTimeout(() => {
          this.off('line', onMessage)
          reject(new Error(`Timeout waiting for stdout line=${line}`))
        }, timeoutMs)
      }

      const normalizedLine = line.trim().toLowerCase()

      const onMessage = (message: any) => {
        if (!message || !message?.toLowerCase()?.includes(normalizedLine)) {
          return
        }

        clearTimeout(timeout)
        this.off('line', onMessage)

        if (message.error) {
          reject(message.error)
        }
        else {
          resolve(message.result)
        }
      }

      const onAbort = () => {
        clearTimeout(timeout)
        this.off('line', onMessage)
        resolve(undefined as any)
      }

      // If already aborted, finish immediately
      if (signal?.aborted) {
        onAbort()
        return
      }

      this.on('line', onMessage)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  private async updateSelf(data: Prisma.TaskUpdateArgs['data']): Promise<TaskWithFullContext> {
    const databaseClient = requireDatabaseClient('TaskInstance updateSelf')

    const updatedTask: TaskWithFullContext = await databaseClient.task.update({
      where: { id: this.task.id },
      data,
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

    broadcastSseChange({
      kind: 'tasks',
      type: 'update',
      data: [ updatedTask ],
    })

    this.task = updatedTask

    return updatedTask
  }

  private async getRequestId(): Promise<number> {
    // TODO: persist this to db! So it persists in between session restarts
    return this.nextRequestId++
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
      const done = () => resolve()
      executionStream.once('end', done)
      executionStream.once('close', done)
      executionStream.once('error', reject)
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
