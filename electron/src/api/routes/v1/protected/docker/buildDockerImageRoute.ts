// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { Request, Response } from 'express'
import type { WorkspaceBuildImageRequest } from '@common/schema'

// Lib
import { v7 as uuid } from 'uuid'

// Utility
import { parseRequestBody } from '../../validation'
import { workspaceBuildImageSchema } from '@common/schema'
import { buildJobManager } from '@electron/api/sse/buildJobManager'
import { buildImage } from '@electron/docker/buildImage'


type BuildDockerImageResponse = {
  jobId: string
}

export async function handleBuildDockerImageRequest(
  request: Request<Record<string, never>, BuildDockerImageResponse, WorkspaceBuildImageRequest>,
  response: Response<BuildDockerImageResponse>,
): Promise<void> {
  const payload = parseRequestBody(
    workspaceBuildImageSchema,
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

function buildWorkspaceForDockerBuild(payload: WorkspaceBuildImageRequest): Workspace {
  const now = new Date()

  return {
    id: `preview-${uuid()}`,
    name: payload.name,
    description: '',
    sourceRepoUrl: payload.sourceRepoUrl,
    customDockerfileCommands: payload.customDockerfileCommands,
    setupScript: payload.setupScript,
    postScript: payload.postScript,
    cacheFiles: [],
    createdAt: now,
    updatedAt: now,
  }
}

async function runDockerBuildJob(
  jobId: string,
  payload: WorkspaceBuildImageRequest,
): Promise<void> {
  const workspace = buildWorkspaceForDockerBuild(payload)

  buildJobManager.broadcast(jobId, 'log', {
    jobId,
    message: 'Starting Docker image build...',
  })

  const buildResult = await buildImage(workspace)

  if (!buildResult.success) {
    const errors = buildResult.errors || []
    if (errors.length === 0) {
      console.debug('Docker image build failed without any errors in the result', {
        jobId,
      })
      buildJobManager.broadcast(jobId, 'log', {
        jobId,
        message: 'Docker image build failed with an unknown error.',
      })
    }

    for (const errorMessage of errors) {
      buildJobManager.broadcast(jobId, 'log', {
        jobId,
        message: `ERROR: ${errorMessage}`,
      })
    }

    buildJobManager.broadcast(jobId, 'finished', {
      jobId,
      status: 'fail',
    })
    buildJobManager.finalizeJob(jobId)
    return
  }

  if (!buildResult.imageTag) {
    console.debug('Docker image build succeeded but did not include an image tag', {
      jobId,
    })
  }

  buildJobManager.broadcast(jobId, 'log', {
    jobId,
    message: 'Docker image build completed successfully.',
  })
  buildJobManager.broadcast(jobId, 'finished', {
    jobId,
    status: 'success',
  })
  buildJobManager.finalizeJob(jobId)
}
