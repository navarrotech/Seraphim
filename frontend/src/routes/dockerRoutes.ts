// Copyright © 2026 Jalapeno Labs

// Misc
import { apiClient } from '@common/api'

export type BuildDockerImageRequest = {
  customDockerfileCommands?: string
}

export type BuildDockerImageResponse = {
  jobId: string
}

export function buildDockerImage(json: BuildDockerImageRequest = {}) {
  return apiClient
    .post('v1/protected/docker/build', {
      json: json,
    })
    .json<BuildDockerImageResponse>()
}
