// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Core
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Lib
import { z } from 'zod'
import { v7 as uuid } from 'uuid'

// Utility
import { parseRequestBody } from '../../validation'
import { getDockerClient } from '@electron/docker/docker'
import { buildJobManager } from '@electron/api/sse/buildJobManager'
import { buildDockerfileContents } from '@electron/docker/image'
import { copyFromResourcesDir } from '@electron/docker/resources'

// Misc
import { ACT_SCRIPT_NAME, DEFAULT_DOCKER_BASE_IMAGE } from '@common/constants'

type BuildDockerImageResponse = {
  jobId: string
}

const buildRequestSchema = z.object({
  containerImage: z.string().trim().min(1).optional().default(DEFAULT_DOCKER_BASE_IMAGE),
  customDockerfileCommands: z.string().trim().optional().default(''),
})

type BuildRequestBody = z.infer<typeof buildRequestSchema>

export async function handleBuildDockerImageRequest(
  request: Request<Record<string, never>, BuildDockerImageResponse, BuildRequestBody>,
  response: Response<BuildDockerImageResponse>,
): Promise<void> {
  const payload = parseRequestBody(
    buildRequestSchema,
    request,
    response,
    {
      context: 'Build docker image API',
      errorMessage: 'Invalid build request',
    },
  )

  if (!payload) {
    console.debug('Build docker image request failed validation')
    return
  }

  const jobId = uuid()
  response.status(202).json({ jobId })

  void runDockerBuildJob(jobId, payload)
}

async function runDockerBuildJob(jobId: string, payload: BuildRequestBody): Promise<void> {
  const dockerClient = getDockerClient()
  if (!dockerClient) {
    buildJobManager.broadcast(jobId, 'log', {
      jobId,
      message: 'Docker is not available on this host.',
    })
    buildJobManager.broadcast(jobId, 'finished', { jobId, status: 'fail' })
    buildJobManager.finalizeJob(jobId)
    console.debug('Docker build requested without a connected client', { jobId })
    return
  }

  const buildTag = `seraphim-build-${jobId}`
  const logs: string[] = []

  let contextDir: string | null = null

  try {
    contextDir = await mkdtemp(join(tmpdir(), 'seraphim-docker-'))
    copyFromResourcesDir(contextDir)

    const actScriptPath = join(contextDir, ACT_SCRIPT_NAME)
    if (!existsSync(actScriptPath)) {
      console.debug('Build docker image missing act installer script', {
        actScriptPath,
      })
      throw new Error('Act installer script is missing')
    }

    const dockerfileContents = buildDockerfileContents(
      payload.containerImage,
      payload.customDockerfileCommands,
    )

    const dockerfilePath = join(contextDir, 'Dockerfile')
    await writeFile(dockerfilePath, dockerfileContents, 'utf8')

    const buildStream = await dockerClient.buildImage(
      {
        context: contextDir,
        src: [ 'Dockerfile', ACT_SCRIPT_NAME ],
      },
      {
        t: buildTag,
        pull: true,
      },
    )

    await collectBuildLogs(dockerClient, buildStream, logs, jobId)

    buildJobManager.broadcast(jobId, 'finished', { jobId, status: 'success' })
  }
  catch (error) {
    console.error('[Docker Build]', 'Build failed', error)
    const message = error instanceof Error ? error.message : 'Docker build failed.'
    logs.push(message)
    buildJobManager.broadcast(jobId, 'log', { jobId, message })
    buildJobManager.broadcast(jobId, 'finished', { jobId, status: 'fail' })
  }
  finally {
    await cleanupDockerImage(dockerClient, buildTag, logs, jobId)
    await cleanupContext(contextDir, logs, jobId)
    buildJobManager.finalizeJob(jobId)
  }
}

function collectBuildLogs(
  dockerClient: ReturnType<typeof getDockerClient>,
  stream: NodeJS.ReadableStream,
  logs: string[],
  jobId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!dockerClient) {
      console.debug('Build log collection called without docker client')
      resolve()
      return
    }

    let hasError = false

    dockerClient.modem.followProgress(
      stream,
      (error: unknown) => {
        if (error) {
          console.error('[Docker Build]', 'Build failed', error)
          reject(error)
          return
        }

        if (hasError) {
          reject(new Error('Docker build failed'))
          return
        }

        console.log('[Docker Build]', 'Build completed successfully')
        resolve()
      },
      (event: Record<string, unknown>) => {
        const errorMessage = resolveBuildError(event)
        if (errorMessage) {
          hasError = true
          const formattedError = `ERROR: ${errorMessage}`
          logs.push(formattedError)
          console.log('[Docker Build]', formattedError)
          buildJobManager.broadcast(jobId, 'log', { jobId, message: formattedError })
          return
        }

        const message = formatBuildEvent(event)
        if (!message) {
          return
        }

        logs.push(message)
        console.log('[Docker Build]', message)
        buildJobManager.broadcast(jobId, 'log', { jobId, message })
      },
    )
  })
}

function resolveBuildError(event: Record<string, unknown>): string | null {
  if (typeof event.error === 'string') {
    return event.error
  }

  const errorDetail = event.errorDetail
  if (typeof errorDetail === 'object' && errorDetail) {
    const message = (errorDetail as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return null
}

function formatBuildEvent(event: Record<string, unknown>): string | null {
  if (typeof event.stream === 'string') {
    return event.stream.trimEnd()
  }

  if (typeof event.status === 'string') {
    if (typeof event.progress === 'string') {
      return `${event.status} ${event.progress}`.trim()
    }

    return event.status
  }

  return null
}

async function cleanupDockerImage(
  dockerClient: ReturnType<typeof getDockerClient>,
  tag: string,
  logs: string[],
  jobId: string,
): Promise<void> {
  if (!dockerClient || !tag) {
    return
  }

  try {
    await dockerClient.getImage(tag).remove({ force: true })
  }
  catch (error) {
    console.debug('Failed to remove temporary docker image', { tag, error })
    logs.push('Warning: Failed to remove temporary docker image.')
    buildJobManager.broadcast(jobId, 'log', {
      jobId,
      message: 'Warning: Failed to remove temporary docker image.',
    })
  }
}

async function cleanupContext(
  contextDir: string | null,
  logs: string[],
  jobId: string,
): Promise<void> {
  if (!contextDir) {
    return
  }

  try {
    await rm(contextDir, { recursive: true, force: true })
  }
  catch (error) {
    console.debug('Failed to remove docker build context', { contextDir, error })
    logs.push('Warning: Failed to remove docker build context.')
    buildJobManager.broadcast(jobId, 'log', {
      jobId,
      message: 'Warning: Failed to remove docker build context.',
    })
  }
}
