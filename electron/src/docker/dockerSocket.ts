// Copyright © 2026 Jalapeno Labs

// Misc
import { DOCKER_SOCK_PATH } from '../env'

type DockerSocketMount = {
  source: string
  target: string
}

export function resolveDockerSocketPath() {
  const trimmedSocketPath = DOCKER_SOCK_PATH?.trim()

  if (trimmedSocketPath) {
    return trimmedSocketPath
  }

  if (process.platform === 'win32') {
    return '//./pipe/docker_engine'
  }

  return '/var/run/docker.sock'
}

function isNpipeSocketPath(socketPath: string) {
  return socketPath.startsWith('\\\\.\\pipe\\')
    || socketPath.startsWith('//./pipe/')
}

export function resolveDockerSocketMount(): DockerSocketMount | null {
  const trimmedSocketPath = DOCKER_SOCK_PATH?.trim()

  if (trimmedSocketPath) {
    if (isNpipeSocketPath(trimmedSocketPath)) {
      console.debug(
        'Docker socket mount skipped, npipe socket is not mountable',
        { socketPath: trimmedSocketPath },
      )
      return null
    }

    return {
      source: trimmedSocketPath,
      target: '/var/run/docker.sock',
    }
  }

  return {
    source: '/var/run/docker.sock',
    target: '/var/run/docker.sock',
  }
}
