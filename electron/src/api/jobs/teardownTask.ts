// Copyright © 2026 Jalapeno Labs

// Core
import { getDockerClient } from '../../docker/docker'

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

  try {
    await dockerClient
      .getContainer(containerId)
      .remove({ force: true })
  }
  catch (error) {
    console.debug('Failed to remove task container', { containerId, error })
  }
}
