// Copyright © 2026 Jalapeno Labs

import Docker from 'dockerode'
import { logFailed, logSuccess } from '../lib/logging'

let docker: Docker
import { DOCKER_SOCK_PATH } from '../env'

export async function connectToDocker() {
  try {
    // Always prioritize the user-preferred socket path first
    if (DOCKER_SOCK_PATH) {
      docker = new Docker({ socketPath: DOCKER_SOCK_PATH })
    }
    else if (process.platform === 'win32') {
      docker = new Docker({ socketPath: '//./pipe/docker_engine' })
    }
    else {
      docker = new Docker({ socketPath: '/var/run/docker.sock' })
    }

    await docker.ping()

    const version = await docker.version()
    console.debug(`Docker version: ${version.Version} (API: ${version.ApiVersion})`)

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
