// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { TaskWithFullContext } from '@common/types'
import type { Cloner } from '@common/cloning/polymorphism/cloner'

// Core
import { getDockerClient } from '@electron/docker/docker'
import { buildDockerfileContents } from '@electron/docker/image'
import { pullWithProgress } from './pullWithProgress'
import { waitForBuildVersion1, waitForBuildVersion2 } from './waitForBuild'

// Node.js
import { mkdtemp, writeFile, rm, readdir } from 'node:fs/promises'
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { utilsDir } from '@electron/lib/internalFiles'

// Utility
import { v7 as uuid } from 'uuid'
import { writeScriptFile } from '@common/writeScriptFile'
import { getCloner } from '@common/cloning/getCloner'

// Misc
import {
  DEFAULT_DOCKER_BASE_IMAGE,
  SETUP_SCRIPT_NAME,
  VALIDATE_SCRIPT_NAME,
  DOCKER_USE_BUILDKIT,
} from '@common/constants'

const contextFiles = [
  'Dockerfile',
  'utils',
  SETUP_SCRIPT_NAME,
  VALIDATE_SCRIPT_NAME,
] as const satisfies string[]

type BuildImageOptions = {
  onLog?: (message: string) => void
}

type BuildImageResult = {
  success: boolean
  imageTag?: string
  errors?: string[]
}

function emitBuildImageLog(message: string, onLog?: (message: string) => void) {
  if (onLog) {
    onLog(message)
  }
}

export async function buildImage(
  workspace: Workspace,
  task?: TaskWithFullContext,
  cloner?: Cloner,
  options: BuildImageOptions = {},
): Promise<BuildImageResult> {
  const { onLog } = options

  let contextDir: string | null = null

  try {
    const dockerClient = getDockerClient()
    const buildTag = `seraphim-${workspace.id}-${uuid()}`

    let cloneUrl: string | null = cloner?.getCloneUrl()
    if (!cloner && task?.authAccount) {
      const resolvedCloner = getCloner(
        task.authAccount.provider,
        workspace.sourceRepoUrl || '',
        task.authAccount.accessToken,
      )
      cloneUrl = resolvedCloner.getCloneUrl()
    }

    const dockerfileContents = buildDockerfileContents(cloneUrl, {
      customCommands: workspace.customDockerfileCommands,
      gitName: task?.authAccount?.name,
      gitEmail: task?.authAccount?.email,
    })

    contextDir = await mkdtemp(
      resolve(tmpdir(), 'seraphim-task-'),
    )
    console.debug('Created Docker build context directory', {
      contextDir,
    })
    emitBuildImageLog(`Created temporary Docker context: ${contextDir}`, onLog)

    if (!existsSync(contextDir)) {
      mkdirSync(contextDir, { recursive: true })
      emitBuildImageLog(`Created missing Docker context directory: ${contextDir}`, onLog)
    }

    if (!existsSync(utilsDir)) {
      console.debug('Utils resources directory not found', {
        utilsDir,
      })
      throw new Error('Utils resources directory is missing')
    }

    console.debug('Copying Docker build context resources', {
      from: utilsDir,
      to: contextDir,
    })
    emitBuildImageLog('Copying Docker utility files into build context', onLog)

    const utilsTargetDir = resolve(contextDir, 'utils')
    mkdirSync(utilsTargetDir, { recursive: true })

    cpSync(utilsDir, utilsTargetDir, {
      recursive: true,
      force: true,
      errorOnExist: false,
    })

    emitBuildImageLog('Writing Dockerfile and scripts into build context', onLog)

    await Promise.all([
      writeScriptFile(
        contextDir,
        SETUP_SCRIPT_NAME,
        workspace.setupScript,
      ),
      writeFile(
        resolve(
          contextDir,
          VALIDATE_SCRIPT_NAME,
        ),
        workspace.postScript,
      ),
      writeFile(
        resolve(contextDir, 'Dockerfile'),
        dockerfileContents,
        'utf8',
      ),
    ])

    const contextDirFiles = await readdir(
      contextDir,
      {
        withFileTypes: true,
        recursive: true,
      },
    )

    console.debug('Context directory files after setup', {
      contextDirFiles,
    })

    emitBuildImageLog(`Pulling base image: ${DEFAULT_DOCKER_BASE_IMAGE}`, onLog)
    await pullWithProgress(
      DEFAULT_DOCKER_BASE_IMAGE,
      {
        onLog,
      },
    )

    emitBuildImageLog('Starting Docker build', onLog)

    const buildStream = await dockerClient.buildImage(
      {
        context: contextDir,
        src: contextFiles,
      },
      {
        t: buildTag,
        pull: true,
        version: DOCKER_USE_BUILDKIT
          ? '2'
          : undefined,
      },
    )

    emitBuildImageLog('Docker build stream started', onLog)

    if (DOCKER_USE_BUILDKIT) {
      await waitForBuildVersion2(
        buildStream,
        dockerClient,
        {
          onLog,
        },
      )
    }
    else {
      await waitForBuildVersion1(
        buildStream,
        dockerClient,
        {
          onLog,
        },
      )
    }

    console.debug('Docker build completed successfully')
    emitBuildImageLog(`Docker build completed successfully for tag: ${buildTag}`, onLog)

    return {
      success: true,
      imageTag: buildTag,
    }
  }
  catch (error) {
    console.debug('Error during image build', {
      error,
    })

    let errorMessage = 'Unknown error during image build'
    if (error instanceof Error && error.message) {
      errorMessage = error.message
    }

    emitBuildImageLog(`ERROR: ${errorMessage}`, onLog)

    return {
      success: false,
      errors: [ errorMessage ],
    }
  }
  finally {
    if (!contextDir) {
      console.debug('Skipping Docker context cleanup because no context directory was created')
    }
    else {
      await rm(
        contextDir,
        {
          recursive: true,
          force: true,
        },
      )

      emitBuildImageLog(`Cleaned up Docker context: ${contextDir}`, onLog)
    }
  }
}
