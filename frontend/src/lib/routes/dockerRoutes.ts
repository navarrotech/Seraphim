// Copyright © 2026 Jalapeno Labs

import type { WorkspaceBuildImageRequest } from '@common/schema'

// Misc
import { apiClient } from '../api'

export type BuildDockerImageRequest = WorkspaceBuildImageRequest

export type BuildDockerImageResponse = {
  jobId: string
}

export function buildDockerImage(payload: BuildDockerImageRequest) {
  return apiClient
    .post('v1/protected/docker/build', {
      json: payload,
    })
    .json<BuildDockerImageResponse>()
}
