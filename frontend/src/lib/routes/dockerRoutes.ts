// Copyright © 2026 Jalapeno Labs

// Misc
import { apiClient } from '../api'

export type BuildDockerImageRequest = {
  containerImage: string
  customDockerfileCommands?: string
}

export type BuildDockerImageResponse = {
  jobId: string
}

export function buildDockerImage(payload: BuildDockerImageRequest) {
  return apiClient
    .post('v1/protected/docker/build', { json: payload })
    .json<BuildDockerImageResponse>()
}
