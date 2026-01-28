// Copyright © 2026 Jalapeno Labs

import type { Workspace, WorkspaceEnv } from '@prisma/client'

// Core
import { v7 as uuid } from 'uuid'
import { getDockerClient } from './docker'

// Node.js
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Utility
import { buildDockerfileContents } from './image'
import { convertEnvironmentToDotEnv } from '@common/envKit'
import { resolveCloneUrl } from '@common/resolveCloneUrl'
import { writeScriptFile } from '@common/writeScriptFile'

export async function createTaskContainerForWorkspace(
  workspace: Workspace,
  repository: string,
  githubTokens: string[],
  resourcesDir: string,
  envEntries: WorkspaceEnv[] = [],
) {
  const dockerClient = getDockerClient()
  if (!dockerClient) {
    console.debug('Docker client requested before connection is established')
    throw new Error('Docker client is not available')
  }

  const cloneResolution = await resolveCloneUrl(repository, githubTokens)
  if (!cloneResolution) {
    console.debug('Unable to resolve a working clone URL for repository', {
      repository,
    })
    throw new Error('Unable to authenticate repository clone')
  }

  const contextDir = await mkdtemp(join(tmpdir(), 'seraphim-task-'))
  let containerId: string | null = null

  try {
    const [ setupScriptName, validateScriptName ] = await Promise.all([
      writeScriptFile(contextDir, 'setup.sh', workspace.setupScript),
      writeScriptFile(contextDir, 'validate.sh', workspace.postScript),
    ])

    const buildTag = `seraphim-workspace-${workspace.id}-${uuid()}`
    const dockerfileContents = buildDockerfileContents(
      workspace.containerImage,
      workspace.customDockerfileCommands,
      cloneResolution.cloneUrl,
      setupScriptName,
      validateScriptName,
    )

    const dockerfilePath = join(contextDir, 'Dockerfile')
    await writeFile(dockerfilePath, dockerfileContents, 'utf8')

    const contextFiles = [ 'Dockerfile' ]
    if (setupScriptName) {
      contextFiles.push(setupScriptName)
    }
    if (validateScriptName) {
      contextFiles.push(validateScriptName)
    }

    const buildStream = await dockerClient.buildImage(
      {
        context: contextDir,
        src: contextFiles,
      },
      {
        t: buildTag,
        pull: true,
      },
    )

    await new Promise<void>((resolve, reject) => {
      let hasError = false

      dockerClient.modem.followProgress(
        buildStream,
        (error: unknown) => {
          if (error) {
            reject(error)
            return
          }

          if (hasError) {
            reject(new Error('Docker build failed'))
            return
          }

          resolve()
        },
        (event: Record<string, unknown>) => {
          if (typeof event.error === 'string') {
            hasError = true
            console.debug('Docker build error', { error: event.error })
            return
          }

          if (typeof event.stream === 'string') {
            const message = event.stream.trim()
            if (message) {
              console.debug('[Docker Build]', message)
            }
          }
        },
      )
    })

    const containerEnv = convertEnvironmentToDotEnv(envEntries)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => Boolean(line))

    const container = await dockerClient.createContainer({
      Image: buildTag,
      name: `seraphim-task-${uuid()}`,
      Env: containerEnv,
      HostConfig: {
        Binds: [ `${resolve(resourcesDir)}:/opt/seraphim/resources` ],
      },
    })

    await container.start()
    containerId = container.id

    return {
      containerId,
      imageTag: buildTag,
      usingToken: cloneResolution.usingToken,
    } as const
  }
  catch (error) {
    if (containerId) {
      await removeTaskContainer(containerId)
    }
    throw error
  }
  finally {
    try {
      await rm(contextDir, { recursive: true, force: true })
    }
    catch (cleanupError) {
      console.debug('Failed to remove task build context', {
        contextDir,
        cleanupError,
      })
    }
  }
}

export async function removeTaskContainer(containerId: string | null) {
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
