// Copyright © 2026 Jalapeno Labs

// Lib
import Docker from 'dockerode'
import { getDockerSocketPath } from './dockerSocket'

// Utility
import { logFailed, logSuccess } from '../lib/logging'

let docker: Docker

export async function connectToDocker() {
  try {
    // Always prioritize the user-preferred socket path first
    docker = new Docker({ socketPath: getDockerSocketPath() })
    await docker.ping()

    const version = await docker.version()
    console.debug(
      `Docker version: ${version.Version} (API: ${version.ApiVersion})`,
    )

    logSuccess('Connected to Docker')
  }
  catch (error) {
    logFailed('Failed to connect to Docker')
    console.error(error)
  }
}

export function disconnectFromDocker() {
  docker = undefined
  logSuccess('Disconnected from Docker')
}

export function getDockerClient(): Docker | null {
  if (!docker) {
    console.debug('Docker client requested before connection is established')
    return null
  }

  return docker
}
