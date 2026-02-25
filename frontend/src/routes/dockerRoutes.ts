// Copyright © 2026 Jalapeno Labs

// Misc
import { frontendClient } from '@frontend/framework/api'

export type BuildDockerImageRequest = {
  customDockerfileCommands?: string
}

export type BuildDockerImageResponse = {
  jobId: string
}

export function buildDockerImage(json: BuildDockerImageRequest = {}) {
  return frontendClient
    .post('v1/protected/docker/build', {
      json: json,
    })
    .json<BuildDockerImageResponse>()
}
