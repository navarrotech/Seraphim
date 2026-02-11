// Copyright © 2026 Jalapeno Labs

import type { getDockerClient } from './docker'

type WaitForBuildOptions = {
  onLog?: (message: string) => void
}

function emitBuildLog(message: string, onLog?: (message: string) => void) {
  if (onLog) {
    onLog(message)
  }
}

function getEventString(event: Record<string, unknown>, key: string): string | null {
  const value = event[key]
  if (typeof value === 'string') {
    return value
  }
  return null
}

function getProgressDetail(event: Record<string, unknown>) {
  const value = event.progressDetail
  if (!value || typeof value !== 'object') {
    return null
  }

  const currentValue = Reflect.get(value, 'current')
  const totalValue = Reflect.get(value, 'total')
  if (typeof currentValue !== 'number' || typeof totalValue !== 'number') {
    return null
  }

  return {
    current: currentValue,
    total: totalValue,
  }
}

function getProgressLabel(event: Record<string, unknown>) {
  const progress = event.progress
  if (typeof progress === 'string' && progress.trim().length > 0) {
    return progress
  }

  const progressDetail = getProgressDetail(event)
  if (!progressDetail) {
    return null
  }

  return `${progressDetail.current}/${progressDetail.total}`
}

function decodeBase64MaybePrintable(input: string): string | null {
  try {
    const buffer = Buffer.from(input, 'base64')
    const rawText = buffer.toString('latin1')

    const printableText = rawText
      .replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ')
      .replace(/Gsha256:[0-9A-Fa-f]{64}\s*/g, '')
      .replace(/sha256:[0-9A-Fa-f]{64}\s*/g, '')
      .replace(/(\[\s*\d+\s*\/\s*\d+\s*\])/g, '\n$1')
      .replace(/\s+/g, ' ')
      .trim()

    if (!printableText.length) {
      return null
    }

    return printableText
  }
  catch (error) {
    console.debug('Failed to decode BuildKit trace output', { error })
    return null
  }
}

function formatBuildStatusMessage(event: Record<string, unknown>): string | null {
  const status = getEventString(event, 'status')
  if (!status) {
    return null
  }

  const id = getEventString(event, 'id')
  const progressLabel = getProgressLabel(event)

  const idPrefix = id ? ` ${id}` : ''
  const progressSuffix = progressLabel ? ` ${progressLabel}` : ''

  return `[Docker Build]${idPrefix} ${status}${progressSuffix}`
}

function formatBuildTraceMessage(event: Record<string, unknown>): string | null {
  const id = getEventString(event, 'id')
  if (id !== 'moby.buildkit.trace') {
    return null
  }

  const aux = event.aux
  if (typeof aux !== 'string') {
    console.debug('BuildKit trace event missing aux payload', { event })
    return null
  }

  const decoded = decodeBase64MaybePrintable(aux)
  if (!decoded) {
    return null
  }

  return `[Docker Build][trace] ${decoded}`
}

function formatBuildStreamMessage(event: Record<string, unknown>): string | null {
  const stream = getEventString(event, 'stream')
  if (!stream) {
    return null
  }

  const message = stream.trim()
  if (!message.length) {
    return null
  }

  return `[Docker Build] ${message}`
}

// For use WITH buildkit (docker build v2+)
export function waitForBuildVersion2(
  buildStream: NodeJS.ReadableStream,
  dockerClient: ReturnType<typeof getDockerClient>,
  options: WaitForBuildOptions = {},
) {
  const { onLog } = options

  return new Promise<void>(function onVersion2Promise(resolve, reject) {
    let hasError = false

    dockerClient.modem.followProgress(
      buildStream,
      function handleBuildFinished(error: unknown) {
        if (error) {
          console.debug('Error during Docker build', {
            error,
          })
          reject(error)
          return
        }

        if (hasError) {
          reject(new Error('Docker build failed'))
          return
        }

        resolve()
      },
      function handleBuildProgress(event: Record<string, unknown>) {
        const errorMessage = getEventString(event, 'error')
        if (errorMessage) {
          hasError = true
          console.debug('Docker build error', { error: errorMessage })
          emitBuildLog(`ERROR: ${errorMessage}`, onLog)
          return
        }

        const statusMessage = formatBuildStatusMessage(event)
        if (statusMessage) {
          console.debug(statusMessage)
          emitBuildLog(statusMessage, onLog)
          return
        }

        const streamMessage = formatBuildStreamMessage(event)
        if (streamMessage) {
          console.debug(streamMessage)
          emitBuildLog(streamMessage, onLog)
          return
        }

        const traceMessage = formatBuildTraceMessage(event)
        if (traceMessage) {
          console.debug(traceMessage)
          emitBuildLog(traceMessage, onLog)
          return
        }

        const id = getEventString(event, 'id')
        if (id === 'moby.image.id') {
          const aux = event.aux
          if (typeof aux === 'string') {
            const imageIdMessage = `[Docker Build] Built image with ID ${aux}`
            console.debug(imageIdMessage)
            emitBuildLog(imageIdMessage, onLog)
            return
          }
        }

        console.debug('[Docker Build] Unrecognized progress event', {
          event,
        })
      },
    )
  })
}

// For use without buildkit (docker build v1)
export function waitForBuildVersion1(
  buildStream: NodeJS.ReadableStream,
  dockerClient: ReturnType<typeof getDockerClient>,
  options: WaitForBuildOptions = {},
) {
  const { onLog } = options

  return new Promise<void>(function onVersion1Promise(resolve, reject) {
    let hasError = false

    dockerClient.modem.followProgress(
      buildStream,
      function handleBuildFinished(error: unknown) {
        if (error) {
          console.debug('Error during Docker build', {
            error,
          })
          reject(error)
          return
        }

        if (hasError) {
          reject(new Error('Docker build failed'))
          return
        }

        resolve()
      },
      function handleBuildProgress(event: Record<string, unknown>) {
        if (typeof event.error === 'string') {
          hasError = true
          console.debug('Docker build error', { error: event.error })
          emitBuildLog(`ERROR: ${event.error}`, onLog)
          return
        }

        if (typeof event.stream === 'string') {
          const message = event.stream.trim()
          if (message) {
            const formattedMessage = `[Docker Build] ${message}`
            console.debug(formattedMessage)
            emitBuildLog(formattedMessage, onLog)
            return
          }
        }

        console.debug('Docker build version 1 received unrecognized progress event', { event })
      },
    )
  })
}
