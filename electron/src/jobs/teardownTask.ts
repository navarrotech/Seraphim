// Copyright © 2026 Jalapeno Labs

// Core
import { getDockerClient } from '../docker/docker'

export async function teardownTask(containerId: string | null) {
  if (!containerId || containerId === 'pending') {
    console.debug('Task container removal requested without container id')
    return
  }

  const dockerClient = getDockerClient()
  if (!dockerClient) {
    console.debug('Task container removal requested without docker client', {
      containerId,
    })
    return
  }

  try {
    const container = await dockerClient.getContainer(containerId)
    if (container) {
      await container.remove({ force: true })
    }
  }
  catch (error) {
    console.warn('Task container removal requested but container wasn\'t found', {
      containerId,
      error,
    })
  }
}
