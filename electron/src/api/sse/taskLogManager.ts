// Copyright © 2026 Jalapeno Labs

import type { Response } from 'express'
import type { PassThrough } from 'node:stream'
import type Docker from 'dockerode'

// Core
import { PassThrough as PassThroughStream } from 'node:stream'

// Misc
import { formatSseEvent } from './sseManager'
import { getDockerClient } from '@electron/docker/docker'

type TaskLogClient = {
  response: Response
}

type TaskLogSession = {
  taskId: string
  containerId: string
  clients: Set<TaskLogClient>
  logStream: NodeJS.ReadableStream | null
  stdoutStream: PassThrough | null
  stderrStream: PassThrough | null
  stdoutBuffer: string
  stderrBuffer: string
  stdoutHandler: ((chunk: Buffer) => void) | null
  stderrHandler: ((chunk: Buffer) => void) | null
  errorHandler: ((error: Error) => void) | null
}

const TASK_STDOUT_EVENT = 'task-stdout'
const TASK_STDERR_EVENT = 'task-stderr'
const TASK_LOG_BUFFER_SIZE = 5000

function createTaskLogManager() {
  const sessionsByTaskId = new Map<string, TaskLogSession>()

  function registerClient(
    taskId: string,
    containerId: string,
    response: Response,
  ): boolean {
    const existingSession = sessionsByTaskId.get(taskId)
    if (existingSession) {
      existingSession.clients.add({ response })
      return true
    }

    const session = createSession(taskId, containerId)
    session.clients.add({ response })
    sessionsByTaskId.set(taskId, session)

    startStreaming(session)
    return true
  }

  function removeClient(taskId: string, response: Response): void {
    const session = sessionsByTaskId.get(taskId)
    if (!session) {
      console.debug('Task log client removal requested for unknown task', {
        taskId,
      })
      return
    }

    for (const client of session.clients) {
      if (client.response === response) {
        session.clients.delete(client)
      }
    }

    if (session.clients.size === 0) {
      stopStreaming(session)
      sessionsByTaskId.delete(taskId)
    }
  }

  function createSession(taskId: string, containerId: string): TaskLogSession {
    return {
      taskId,
      containerId,
      clients: new Set<TaskLogClient>(),
      logStream: null,
      stdoutStream: null,
      stderrStream: null,
      stdoutBuffer: '',
      stderrBuffer: '',
      stdoutHandler: null,
      stderrHandler: null,
      errorHandler: null,
    }
  }

  async function startStreaming(session: TaskLogSession): Promise<void> {
    const dockerClient = getDockerClient()
    if (!dockerClient) {
      console.debug('Task log streaming requested without docker client', {
        taskId: session.taskId,
      })
      closeSession(session)
      return
    }

    try {
      const container = dockerClient.getContainer(session.containerId)
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      })

      const stdoutStream = new PassThroughStream()
      const stderrStream = new PassThroughStream()

      dockerClient.modem.demuxStream(logStream, stdoutStream, stderrStream)

      session.logStream = logStream
      session.stdoutStream = stdoutStream
      session.stderrStream = stderrStream

      function handleStdoutChunk(chunk: Buffer) {
        handleStreamChunk(session, 'stdout', TASK_STDOUT_EVENT, chunk)
      }

      function handleStderrChunk(chunk: Buffer) {
        handleStreamChunk(session, 'stderr', TASK_STDERR_EVENT, chunk)
      }

      function handleLogStreamError(error: Error) {
        console.debug('Task log stream error', {
          taskId: session.taskId,
          error,
        })
        closeSession(session)
      }

      session.stdoutHandler = handleStdoutChunk
      session.stderrHandler = handleStderrChunk
      session.errorHandler = handleLogStreamError

      stdoutStream.on('data', handleStdoutChunk)
      stderrStream.on('data', handleStderrChunk)
      logStream.on('error', handleLogStreamError)
    }
    catch (error) {
      console.debug('Failed to start task log stream', {
        taskId: session.taskId,
        error,
      })
      closeSession(session)
    }
  }

  function stopStreaming(session: TaskLogSession): void {
    if (session.stdoutStream && session.stdoutHandler) {
      session.stdoutStream.removeListener('data', session.stdoutHandler)
    }

    if (session.stderrStream && session.stderrHandler) {
      session.stderrStream.removeListener('data', session.stderrHandler)
    }

    if (session.logStream && session.errorHandler) {
      session.logStream.removeListener('error', session.errorHandler)
    }

    session.logStream?.removeAllListeners()
    session.logStream?.pause()
    session.logStream?.unpipe()

    session.stdoutStream?.removeAllListeners()
    session.stderrStream?.removeAllListeners()
    session.stdoutStream?.destroy()
    session.stderrStream?.destroy()

    session.logStream = null
    session.stdoutStream = null
    session.stderrStream = null
    session.stdoutHandler = null
    session.stderrHandler = null
    session.errorHandler = null
    session.stdoutBuffer = ''
    session.stderrBuffer = ''
  }

  function closeSession(session: TaskLogSession): void {
    stopStreaming(session)

    for (const client of session.clients) {
      client.response.end()
    }

    session.clients.clear()
    sessionsByTaskId.delete(session.taskId)
  }

  function handleStreamChunk(
    session: TaskLogSession,
    streamType: 'stdout' | 'stderr',
    eventName: string,
    chunk: Buffer,
  ): void {
    const updatedBuffer = appendChunkToBuffer(
      streamType,
      session,
      chunk.toString('utf8'),
      eventName,
    )

    if (streamType === 'stdout') {
      session.stdoutBuffer = updatedBuffer
      return
    }

    session.stderrBuffer = updatedBuffer
  }

  function appendChunkToBuffer(
    streamType: 'stdout' | 'stderr',
    session: TaskLogSession,
    chunkText: string,
    eventName: string,
  ): string {
    const existingBuffer = streamType === 'stdout'
      ? session.stdoutBuffer
      : session.stderrBuffer

    const combined = `${existingBuffer}${chunkText}`
    const lines = combined.split('\n')
    const remainder = lines.pop() ?? ''

    for (const line of lines) {
      emitLine(session, eventName, stripCarriageReturn(line))
    }

    if (remainder.length > TASK_LOG_BUFFER_SIZE) {
      return remainder.slice(-TASK_LOG_BUFFER_SIZE)
    }

    return remainder
  }

  function stripCarriageReturn(line: string): string {
    if (line.endsWith('\r')) {
      return line.slice(0, -1)
    }

    return line
  }

  function emitLine(
    session: TaskLogSession,
    eventName: string,
    line: string,
  ): void {
    if (session.clients.size === 0) {
      return
    }

    const payload = formatSseEvent(eventName, line)
    for (const client of session.clients) {
      client.response.write(payload)
    }
  }

  return {
    registerClient,
    removeClient,
  } as const
}

export const taskLogManager = createTaskLogManager()

export async function writeTaskLogSnapshot(
  containerId: string,
  response: Response,
): Promise<void> {
  const dockerClient = getDockerClient()
  if (!dockerClient) {
    console.debug('Task log snapshot requested without docker client', {
      containerId,
    })
    return
  }

  const container = dockerClient.getContainer(containerId)

  try {
    const logResult = await container.logs({
      follow: false,
      stdout: true,
      stderr: true,
    })

    await streamSnapshot(logResult, response, dockerClient)
  }
  catch (error) {
    console.debug('Failed to read task log snapshot', {
      containerId,
      error,
    })
  }
}

async function streamSnapshot(
  logResult: NodeJS.ReadableStream | Buffer,
  response: Response,
  dockerClient: Docker,
): Promise<void> {
  if (Buffer.isBuffer(logResult)) {
    streamSnapshotBuffer(logResult, response)
    return
  }

  const logStream = logResult

  await new Promise<void>((resolve) => {
    let stdoutBuffer = ''
    let stderrBuffer = ''
    let isResolved = false

    const stdoutStream = new PassThroughStream()
    const stderrStream = new PassThroughStream()

    dockerClient.modem.demuxStream(logStream, stdoutStream, stderrStream)

    function finalize() {
      if (isResolved) {
        return
      }

      if (stdoutBuffer) {
        response.write(formatSseEvent(TASK_STDOUT_EVENT, stdoutBuffer))
      }

      if (stderrBuffer) {
        response.write(formatSseEvent(TASK_STDERR_EVENT, stderrBuffer))
      }

      isResolved = true
      stdoutStream.removeAllListeners()
      stderrStream.removeAllListeners()
      logStream.removeAllListeners()
      stdoutStream.destroy()
      stderrStream.destroy()
      resolve()
    }

    function handleStdoutChunk(chunk: Buffer) {
      stdoutBuffer = appendSnapshotChunk(
        stdoutBuffer,
        TASK_STDOUT_EVENT,
        chunk,
        response,
      )
    }

    function handleStderrChunk(chunk: Buffer) {
      stderrBuffer = appendSnapshotChunk(
        stderrBuffer,
        TASK_STDERR_EVENT,
        chunk,
        response,
      )
    }

    function handleStreamError(error: Error) {
      console.debug('Task log snapshot stream error', { error })
      finalize()
    }

    stdoutStream.on('data', handleStdoutChunk)
    stderrStream.on('data', handleStderrChunk)
    logStream.on('error', handleStreamError)
    logStream.on('end', finalize)
    logStream.on('close', finalize)
  })
}

function streamSnapshotBuffer(buffer: Buffer, response: Response): void {
  if (buffer.length === 0) {
    console.debug('Task log snapshot buffer was empty')
    return
  }

  let offset = 0
  while (offset + 8 <= buffer.length) {
    const streamType = buffer.readUInt8(offset)
    const payloadLength = buffer.readUInt32BE(offset + 4)
    const payloadStart = offset + 8
    const payloadEnd = payloadStart + payloadLength

    if (payloadEnd > buffer.length) {
      console.debug('Task log snapshot buffer ended mid-frame', {
        offset,
        payloadLength,
        totalLength: buffer.length,
      })
      break
    }

    const payload = buffer.subarray(payloadStart, payloadEnd).toString('utf8')
    const eventName = streamType === 2
      ? TASK_STDERR_EVENT
      : TASK_STDOUT_EVENT

    const lines = payload.split('\n')
    const remainder = lines.pop() ?? ''

    for (const line of lines) {
      const cleaned = line.endsWith('\r')
        ? line.slice(0, -1)
        : line
      response.write(formatSseEvent(eventName, cleaned))
    }

    if (remainder.trim().length > 0) {
      response.write(formatSseEvent(eventName, remainder))
    }

    offset = payloadEnd
  }
}

function appendSnapshotChunk(
  buffer: string,
  eventName: string,
  chunk: Buffer,
  response: Response,
): string {
  const combined = `${buffer}${chunk.toString('utf8')}`
  const lines = combined.split('\n')
  const remainder = lines.pop() ?? ''

  for (const line of lines) {
    const cleaned = line.endsWith('\r')
      ? line.slice(0, -1)
      : line
    response.write(formatSseEvent(eventName, cleaned))
  }

  if (remainder.length > TASK_LOG_BUFFER_SIZE) {
    return remainder.slice(-TASK_LOG_BUFFER_SIZE)
  }

  return remainder
}
