// Copyright © 2026 Jalapeno Labs

// Core
import { getDockerClient } from '../docker/docker'

export async function teardownTask(containerId: string | null) {
  if (!containerId) {
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

  let container
  try {
    container = await dockerClient.getContainer(containerId)
  }
  catch {
    console.warn('Task container removal requested but container wasn\'t found', {
      containerId,
    })
    return
  }

  try {
    await container.remove({ force: true })
  }
  catch (error) {
    console.debug('Failed to remove task container', { containerId, error })
  }
}
