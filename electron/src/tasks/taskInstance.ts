// Copyright © 2026 Jalapeno Labs

import type { Prisma } from '@prisma/client'
import type { TaskWithFullContext } from '@common/types'
import type {
  ClientRequest,
  ClientNotification,
  ServerNotification,
} from '@electron/vendor/codex-protocol'
import type {
  RateLimitSnapshot,
  ThreadTokenUsage,
  ThreadStartResponse,
} from '@electron/vendor/codex-protocol/v2'

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

type InboundCodexEvent = ServerNotification

type EventMap = {
  'stdout': [ Buffer ]
  'stderr': [ Buffer ]
  'line': [ string | Buffer ]
  'message': [ InboundCodexEvent ]
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

  private codexThreadId: string | null = null
  private nextRequestId: number = 1
  private codexStream: NodeJS.ReadWriteStream | null = null

  private rateLimits: RateLimitSnapshot | null = null
  private usage: ThreadTokenUsage | null = null

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

  private getRequestId(): number {
    return this.nextRequestId++
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

      const abortController = new AbortController()
      const buildCompleteScriptPromise = this.waitForStdout(SETUP_SUCCESS_LINE, -1, abortController.signal)
      const buildFailureScriptPromise = this.waitForStdout(SETUP_FAILURE_LINE, -1, abortController.signal)

      const container = await dockerClient.createContainer({
        name: this.task.containerName,
        Image,
        Env,
        HostConfig: {
          Binds: volumes,
          NetworkMode: 'host',
        },
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

      // This only guarantees that the setup script has completed
      // This does *NOT* guarantee that the `codex app-server` process has fully started.
      // Typically it's started immediately AFTER this gets logged
      const completed = await Promise.race([
        buildCompleteScriptPromise
          .then(() => ({ type: 'success' as const }))
          .catch((error) => ({ type: 'success-error' as const, error })),
        buildFailureScriptPromise
          .then(() => ({ type: 'failure' as const }))
          .catch((error) => ({ type: 'failure-error' as const, error })),
      ])

      if (completed.type !== 'success') {
        throw new Error(`Setup script did not complete successfully: ${completed.type}`)
      }

      await this.startCodexAppServer(container)

      const initId = this.getRequestId()
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

      const threadStartId = this.getRequestId()
      this.sendMessage({
        method: 'thread/start',
        id: threadStartId,
        params: {
          experimentalRawEvents: false,
          model: llm.preferredModel,
        },
      })

      const threadResult = await this.waitForResponse<ThreadStartResponse>(threadStartId)

      console.debug('Received thread/start response from Codex', {
        threadId: threadResult.thread.id,
      })

      this.attachCodexSubscriptions()

      // TODO: persist this to db! So it persists in between session restarts
      this.codexThreadId = threadResult.thread.id

      await updateTaskState(this.task.id, 'Working')

      const turnStartId = this.getRequestId()
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

      const parsedMessage = safeParseJson<InboundCodexEvent>(line, undefined, true)
      if (parsedMessage) {
        this.emit('message', parsedMessage)
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
    }

    function handleStderrData(this: TaskInstance, chunk: Buffer) {
      this.emit('stderr', chunk)
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
    if (!this.codexStream) {
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
    this.codexStream.write(payload)
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

  private subscription: ((message: InboundCodexEvent) => void) | null = null
  protected attachCodexSubscriptions() {
    if (this.subscription) {
      this.removeListener('message', this.subscription)
    }

    const handleMessage = async (message: InboundCodexEvent) => {
      const { method, params } = message

      if (!method) {
        if ('result' in message && !params) {
          // Return silently, this is okay
          // This is typically just a turn/start response
          return
        }

        console.debug('Received Codex message without method', {
          taskId: this.task.id,
          message,
        })
        return
      }

      if (method.startsWith('codex/event/')) {
        // These are legacy events that codex app-server still emits
        // but we don't need to do anything with them in seraphim
        return
      }

      // Notes:
      // "item" = one atomic thing the agent produced
      // "turn" = the whole “job” kicked off by one user input
      switch (method) {
        case 'turn/started':
          await this.updateSelf({
            state: 'AwaitingReview',
          })
          break
        case 'turn/completed':
          console.log('Task completed!!')
          console.log('Rate limits:', this.rateLimits)
          console.log('Usage:', this.usage)
          await this.updateSelf({
            state: 'AwaitingReview',
          })
          break
        case 'turn/diff/updated':
          console.log('Handling turn/diff/updated')
          break
        case 'item/started':
          console.log('Handling item/started')
          break
        case 'item/fileChange/outputDelta':
          console.log('Handling item/fileChange/outputDelta')
          break
        case 'item/reasoning/summaryTextDelta':
          // console.log('Handling item/reasoning/summaryTextDelta')
          break
        case 'item/completed':
          console.log('Handling item/completed')
          break
        case 'item/agentMessage/delta':
          // For partial eager streaming of agent messages
          // console.log('Handling item/agentMessage/delta', params)
          break
        case 'account/rateLimits/updated':
          this.rateLimits = params.rateLimits
          break
        case 'thread/tokenUsage/updated':
          this.usage = params.tokenUsage
          break
        case 'item/reasoning/summaryPartAdded':
        case 'thread/started':
        case 'thread/compacted':
          // Not much do to here yet! Added here so they're muted from console.
          break
        default:
          console.debug('Unhandled Codex message response:', message)
      }
    }

    this.addListener('message', handleMessage)
    this.subscription = handleMessage
  }

  private async startCodexAppServer(container: any) {
    const execInstance = await container.exec({
    Cmd: [ 'bash', '-lc', 'codex app-server 2> >(tee /proc/1/fd/2 >&2) | tee /proc/1/fd/1' ],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    })

    const stream = await execInstance.start({
      hijack: true,
      stdin: true,
    })

    // stream is multiplexed stdout/stderr when Tty=false
    const stdoutStream = new PassThrough()
    const stderrStream = new PassThrough()
    getDockerClient().modem.demuxStream(stream, stdoutStream, stderrStream)

    // IMPORTANT: write requests to `stream` (the hijacked duplex)
    this.codexStream = stream

    // // Read responses from stdoutStream line-by-line
    // const stdoutReader = createInterface({ input: stdoutStream })
    // stdoutReader.on('line', (line) => {
    //   const parsed = safeParseJson(line, undefined, true)
    //   console.log('>>> ' + line)
    //   if (parsed) {
    //     this.emit('message', parsed)
    //   }
    //   else {
    //     this.emit('line', line)
    //   }
    // })

    // // stderr is useful for debugging
    // const stderrReader = createInterface({ input: stderrStream })
    // stderrReader.on('line', (line) => {
    //   this.emit('line', `[codex:stderr] ${line}`)
    //   console.error(`[codex:stderr] ${line}`)
    // })
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
}
