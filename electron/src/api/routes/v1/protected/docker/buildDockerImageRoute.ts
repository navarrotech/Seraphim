// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { Request, Response } from 'express'
import type { z } from 'zod'

// Core
import { getDockerClient } from '@electron/docker/docker'
import { buildJobManager } from '@electron/api/sse/buildJobManager'
import { buildImage } from '@electron/docker/buildImage'

// Lib
import { v7 as uuid } from 'uuid'

// Utility
import { parseRequestBody } from '../../validation'
import { buildDockerImageSchema } from '@common/schema'

type BuildStatus = 'success' | 'fail'

type BuildDockerImageResponse = {
  jobId: string
}

type BuildRequestBody = z.infer<typeof buildDockerImageSchema>

function toBuildWorkspace(requestBody: BuildRequestBody): Workspace {
  const workspaceId = uuid()
  const now = new Date()

  return {
    id: workspaceId,
    name: requestBody.name,
    description: requestBody.description,
    sourceRepoUrl: requestBody.sourceRepoUrl,
    customDockerfileCommands: requestBody.customDockerfileCommands,
    setupScript: requestBody.setupScript,
    postScript: requestBody.postScript,
    cacheFiles: requestBody.cacheFiles,
    createdAt: now,
    updatedAt: now,
  }
}

function publishBuildLog(jobId: string, message: string) {
  buildJobManager.broadcast(jobId, 'log', {
    jobId,
    message,
  })
}

function finishBuildJob(jobId: string, status: BuildStatus) {
  buildJobManager.broadcast(jobId, 'finished', {
    jobId,
    status,
  })
  buildJobManager.finalizeJob(jobId)
}

async function runDockerBuildJob(jobId: string, workspace: Workspace) {
  const dockerClient = getDockerClient()
  if (!dockerClient) {
    const unavailableMessage = 'Docker is not available on this host.'
    publishBuildLog(jobId, unavailableMessage)
    finishBuildJob(jobId, 'fail')
    console.debug('Docker build requested without a connected client', {
      jobId,
    })
    return
  }

  try {
    const startedMessage = `Starting Docker image build for repository: ${workspace.sourceRepoUrl}`
    publishBuildLog(jobId, startedMessage)

    const buildResult = await buildImage(
      workspace,
      undefined,
      undefined,
      {
        onLog: function onBuildLog(message: string) {
          publishBuildLog(jobId, message)
        },
      },
    )
    if (!buildResult.success) {
      const errors = buildResult.errors || [ 'Docker image build failed.' ]
      for (const errorMessage of errors) {
        publishBuildLog(jobId, errorMessage)
      }
      finishBuildJob(jobId, 'fail')
      return
    }

    if (buildResult.imageTag) {
      publishBuildLog(jobId, `Docker image built successfully: ${buildResult.imageTag}`)
    }
    else {
      publishBuildLog(jobId, 'Docker image built successfully.')
    }

    finishBuildJob(jobId, 'success')
  }
  catch (error) {
    const unknownErrorMessage = 'Docker image build failed with an unexpected error.'
    const errorMessage = error instanceof Error
      ? error.message
      : unknownErrorMessage

    console.debug('Docker image build failed while running build job', {
      error,
      jobId,
    })
    publishBuildLog(jobId, errorMessage)
    finishBuildJob(jobId, 'fail')
  }
}

export async function handleBuildDockerImageRequest(
  request: Request<Record<string, never>, BuildDockerImageResponse, BuildRequestBody>,
  response: Response<BuildDockerImageResponse>,
): Promise<void> {
  const payload = parseRequestBody(
    buildDockerImageSchema,
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
  const workspace = toBuildWorkspace(payload)

  response.status(202).json({ jobId })

  void runDockerBuildJob(jobId, workspace)
}
