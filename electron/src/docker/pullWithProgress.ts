// Copyright © 2026 Jalapeno Labs

// Core
import { getDockerClient } from './docker'

type PullProgressEvent = {
  status?: string
  id?: string
  progress?: string
  error?: string
}

type PullWithProgressOptions = {
  onLog?: (message: string) => void
}

function emitPullLog(message: string, onLog?: (message: string) => void) {
  if (onLog) {
    onLog(message)
  }
}

export async function pullWithProgress(image: string, options: PullWithProgressOptions = {}) {
  if (!image?.trim()) {
    console.debug('pullWithProgress missing image input', { image })
    throw new Error('pullWithProgress requires a non-empty image name')
  }

  const { onLog } = options

  const dockerClient = getDockerClient()
  const stream = await new Promise<NodeJS.ReadableStream>(function onPullPromise(resolve, reject) {
    dockerClient.pull(
      image,
      function onPullComplete(error: Error | null, pullStream?: NodeJS.ReadableStream) {
        if (error) {
          console.debug('pullWithProgress failed to start pull', { error, image })
          reject(error)
          return
        }

        if (!pullStream) {
          console.debug('pullWithProgress missing pull stream', { image })
          reject(new Error('pullWithProgress did not receive a pull stream'))
          return
        }

        resolve(pullStream)
      },
    )
  })

  await new Promise<void>(function onFollowProgressPromise(resolve, reject) {
    dockerClient.modem.followProgress(
      stream,
      function onFollowProgressComplete(error) {
        if (error) {
          console.debug('pullWithProgress failed while following progress', { error })
          reject(error)
          return
        }

        resolve()
      },
      function onPullProgressEvent(event: PullProgressEvent) {
        if (event.error) {
          console.debug('pullWithProgress received error event', { event })
          reject(new Error(event.error))
          return
        }

        if (event.id && event.status) {
          const progressText = event.progress ? ` ${event.progress}` : ''
          const message = `${event.id}: ${event.status}${progressText}`
          process.stdout.write(`\r${message}   `)
          emitPullLog(message, onLog)
          return
        }

        if (event.status) {
          process.stdout.write(`\r${event.status}   `)
          emitPullLog(event.status, onLog)
          return
        }

        console.debug('pullWithProgress received unrecognized progress event', { event })
      },
    )
  })

  process.stdout.write('\n')
}
