// Copyright © 2026 Jalapeno Labs

// Lib
import Docker from 'dockerode'

// Utility
import { logFailed, logSuccess } from '../lib/logging'
import {
  resolveDockerSocketMount,
  resolveDockerSocketPath,
} from './dockerSocket'

let docker: Docker

export { resolveDockerSocketMount, resolveDockerSocketPath }

export async function connectToDocker() {
  try {
    // Always prioritize the user-preferred socket path first
    docker = new Docker({ socketPath: resolveDockerSocketPath() })
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
