// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { TaskWithFullContext } from '@common/types'
import type { Cloner } from '@common/cloning/polymorphism/cloner'

// Docker
import { getDockerClient } from '@electron/docker/docker'
import { buildDockerfileContents } from '@electron/docker/image'
import { pullWithProgress } from './pullWithProgress'
import { waitForBuildVersion1, waitForBuildVersion2 } from './waitForBuild'
import { createCodexConfig, createCodexAuthFile } from '@common/codexConfig'

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
import { getSecrets } from '@electron/tasks/getSecrets'

const contextFiles = [
  'Dockerfile',
  `utils`,
  SETUP_SCRIPT_NAME,
  VALIDATE_SCRIPT_NAME,
  'codex_config.toml',
  'codex_auth.json',
] as const satisfies string[]

type BuildImageResult = {
  success: boolean
  imageTag?: string
  errors?: string[]
}

export async function buildImage(
  workspace: Workspace,
  task?: TaskWithFullContext,
  cloner?: Cloner,
): Promise<BuildImageResult> {
  let contextDir: string | null = null

  try {
    const dockerClient = getDockerClient()
    const buildTag = `seraphim-${workspace.id}-${uuid()}`

    // /////////////////////////// //
    //          SETUP INFO         //
    // /////////////////////////// //

    let cloneUrl: string | null = cloner?.getCloneUrl()
    if (!cloner && task?.authAccount) {
      const cloner = getCloner(
        task.authAccount.provider,
        workspace.sourceRepoUrl || '',
        task.authAccount.accessToken,
      )
      cloneUrl = cloner.getCloneUrl()
    }

    const dockerfileContents = buildDockerfileContents({
      customCommands: workspace.customDockerfileCommands,
      gitName: task?.authAccount?.name,
      gitEmail: task?.authAccount?.email,
    })

    // /////////////////////////// //
    //     PREPARE CONTEXT DIR     //
    // /////////////////////////// //

    contextDir = await mkdtemp(
      resolve(tmpdir(), 'seraphim-task-'),
    )
    console.debug('Created Docker build context directory', {
      contextDir,
    })

    if (!existsSync(contextDir)) {
      mkdirSync(contextDir, { recursive: true })
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

    const utilsTargetDir = resolve(contextDir, 'utils')
    mkdirSync(utilsTargetDir, { recursive: true })

    // Copy *contents* of resourcesDir into contextDir by copying the utils folder from within resourcesDir
    cpSync(utilsDir, utilsTargetDir, {
      recursive: true,
      force: true, // overwrite existing files
      errorOnExist: false,
    })

    console.debug('Initializing security for stdout redaction')
    const secrets = await getSecrets()

    console.debug('Writing Dockerfile, setup script, and validate script to context directory...')

    await Promise.all([
      writeScriptFile(
        contextDir,
        cloneUrl,
        task.sourceGitBranch,
        workspace.setupScript,
        secrets,
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
        'utf-8',
      ),
      writeFile(
        resolve(contextDir, 'codex_config.toml'),
        createCodexConfig(task!),
        'utf-8',
      ),
      writeFile(
        resolve(contextDir, 'codex_auth.json'),
        createCodexAuthFile(task!),
        'utf-8',
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

    // /////////////////////////// //
    //       BUILD THE IMAGE       //
    // /////////////////////////// //

    console.debug('Pulling the base Docker image...')
    await pullWithProgress(DEFAULT_DOCKER_BASE_IMAGE)

    console.debug('Starting Docker image build...')

    const buildStream = await dockerClient.buildImage(
      {
        context: contextDir,
        src: contextFiles,
      },
      {
        t: buildTag,
        pull: true,
        // Specify if we should use BuildKit for better performance and output
        version: DOCKER_USE_BUILDKIT
          ? '2'
          : undefined,
      },
    )

    console.debug('Waiting for the Docker build to complete...')

    // Wait for the build to complete!
    if (DOCKER_USE_BUILDKIT) {
      await waitForBuildVersion2(buildStream, dockerClient)
    }
    else {
      await waitForBuildVersion1(buildStream, dockerClient)
    }

    console.debug('Docker build completed successfully')

    return {
      success: true,
      imageTag: buildTag,
    }
  }
  catch (error) {
    console.debug('Error during image build', {
      error,
    })
    return {
      success: false,
      errors: [ (error as Error).message || 'Unknown error during image build' ],
    }
  }
  finally {
    // Cleanup the context dir!
    await rm(
      contextDir,
      {
        recursive: true,
        force: true,
      },
    )
  }
}
