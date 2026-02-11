// Copyright © 2026 Jalapeno Labs

import type { getDockerClient } from './docker'

// For use WITH buildkit (docker build v2+)
export function waitForBuildVersion2(
  buildStream: NodeJS.ReadableStream,
  dockerClient: ReturnType<typeof getDockerClient>,
) {
  return new Promise<void>((resolve, reject) => {
    let hasError = false

    function getEventString(
      event: Record<string, unknown>,
      key: string,
    ) {
      const value = event[key]
      if (typeof value === 'string') {
        return value
      }
      return null
    }

    function decodeBase64MaybePrintable(input: string): string | null {
      try {
        const buf = Buffer.from(input, 'base64')
        // Convert to latin1 so we don't throw away bytes; then strip non-printables
        const raw = buf.toString('latin1')

        // Keep a readable subset. This is intentionally simple.
        const printable = raw
          .replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ') // collapse binary
          .replace(/Gsha256:[0-9A-Fa-f]{64}\s*/g, '') // Remove buildkit's content digest logs
          .replace(/sha256:[0-9A-Fa-f]{64}\s*/g, '') // Remove buildkit's content digest logs
          .replace(/(\[\s*\d+\s*\/\s*\d+\s*\])/g, '\n$1') // Add a new line after each [Number/Number] progress step
          .replace(/\s+/g, ' ')
          .trim()

        return printable.length ? printable : null
      }
      catch {
        return null
      }
    }

    function getProgressDetail(
      event: Record<string, unknown>,
    ) {
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

    function getProgressLabel(
      event: Record<string, unknown>,
    ) {
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
          return
        }

        const status = getEventString(event, 'status')
        if (status) {
          const id = getEventString(event, 'id')
          const progressLabel = getProgressLabel(event)
          const prefix = id ? ` ${id}` : ''
          const progressSuffix = progressLabel ? ` ${progressLabel}` : ''
          console.debug(
            `[Docker Build]${prefix} ${status}${progressSuffix}`,
          )
          return
        }

        const stream = getEventString(event, 'stream')
        if (stream) {
          const message = stream.trim()
          if (message) {
            console.debug('[Docker Build]', message)
          }
          return
        }

        const id = getEventString(event, 'id')
        if (id === 'moby.buildkit.trace') {
          const aux = event.aux
          if (typeof aux === 'string') {
            const decoded = decodeBase64MaybePrintable(aux)
            if (decoded) {
              console.debug('[Docker Build][trace]', decoded)
              return
            }
          }
          // If it isn't decodable/printable, just ignore it
          return
        }

        if (id === 'moby.image.id') {
          const aux = event.aux
          if (typeof aux === 'string') {
            console.debug('[Docker Build] Built image with ID', aux)
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
) {
  return new Promise<void>((resolve, reject) => {
    let hasError = false

    dockerClient.modem.followProgress(
      buildStream,
      (error: unknown) => {
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
      (event: Record<string, unknown>) => {
        if (typeof event.error === 'string') {
          hasError = true
          console.debug('Docker build error', { error: event.error })
          return
        }

        if (typeof event.stream === 'string') {
          const message = event.stream.trim()
          if (message) {
            console.debug('[Docker Build]', message)
          }
        }
      },
    )
  })
}
