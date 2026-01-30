// Copyright © 2026 Jalapeno Labs

import type { WorkspaceWithEnv } from '@common/types'
import type { TaskState } from '@prisma/client'
import type Docker from 'dockerode'

// Node.js
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'

// Lib
import { v7 as uuid } from 'uuid'

// Utility
import { buildDockerfileContents } from '../docker/image'
import { convertEnvironmentToDotEnv } from '@common/envKit'
import { resolveCloneUrl } from '@common/resolveCloneUrl'
import { writeScriptFile } from '@common/writeScriptFile'
import { copyFromResourcesDir } from '@electron/docker/resources'
import { ACT_SCRIPT_NAME } from '@common/constants'

// Misc
import { getDockerClient, resolveDockerSocketMount } from '../docker/docker'
import { teardownTask } from './teardownTask'
import { updateTaskState } from './updateTaskState'

const SETUP_SUCCESS_FILE = '/opt/seraphim/setup-success'
const SETUP_FAILED_FILE = '/opt/seraphim/setup-failed'

export async function launchTask(
  workspace: WorkspaceWithEnv,
  repository: string,
  githubTokens: string[],
  taskId: string,
  containerName?: string,
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
    copyFromResourcesDir(contextDir)

    const actScriptPath = join(contextDir, ACT_SCRIPT_NAME)
    if (!existsSync(actScriptPath)) {
      console.debug('LaunchTask missing act installer script', {
        actScriptPath,
      })
      throw new Error('Act installer script is missing')
    }

    const [ setupScriptName, validateScriptName ] = await Promise.all([
      writeScriptFile(contextDir, 'setup.sh', workspace.setupScript),
      writeScriptFile(contextDir, 'validate.sh', workspace.postScript),
    ])

    const buildTag = `seraphim-workspace-${workspace.id}-${uuid()}`
    const dockerfileContents = buildDockerfileContents(
      workspace.containerImage,
      workspace.customDockerfileCommands,
      setupScriptName,
      validateScriptName,
      workspace,
      cloneResolution.cloneUrl,
    )

    const dockerfilePath = join(contextDir, 'Dockerfile')
    await writeFile(dockerfilePath, dockerfileContents, 'utf8')

    const contextFiles = [ 'Dockerfile', ACT_SCRIPT_NAME ]
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

    const containerEnv = convertEnvironmentToDotEnv(workspace.envEntries)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => Boolean(line))

    const socketMount = resolveDockerSocketMount()
    const containerBinds = []
    if (socketMount) {
      containerBinds.push(`${socketMount.source}:${socketMount.target}`)
    }

    const resolvedContainerName = resolveContainerName(containerName)
    const container = await dockerClient.createContainer({
      Image: buildTag,
      name: resolvedContainerName,
      Env: containerEnv,
      HostConfig: {
        Binds: containerBinds,
      },
    })

    await container.start()
    containerId = container.id

    const didSetupComplete = setupScriptName
      ? await waitForSetupScriptCompletion(container, taskId)
      : true

    if (!didSetupComplete) {
      console.debug('Setup script failed before completion marker', {
        taskId,
        containerId,
      })

      const failedState: TaskState = 'Failed'
      await updateTaskState(taskId, failedState)
      throw new Error('Setup script failed before completion marker')
    }

    const workingState: TaskState = 'Working'
    await updateTaskState(taskId, workingState)

    return {
      containerId,
      containerName: resolvedContainerName,
      imageTag: buildTag,
      usingToken: cloneResolution.usingToken,
    } as const
  }
  catch (error) {
    try {
      const failedState: TaskState = 'Failed'
      await updateTaskState(taskId, failedState)
    }
    catch (stateError) {
      console.debug('Failed to update task state after launch error', {
        taskId,
        stateError,
      })
    }

    if (containerId) {
      await teardownTask(containerId)
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

function resolveContainerName(containerName?: string) {
  if (!containerName) {
    console.debug('LaunchTask missing container name, using fallback')
    return `seraphim-task-${uuid()}`
  }

  const trimmedName = containerName.trim()
  if (!trimmedName) {
    console.debug('LaunchTask received empty container name, using fallback')
    return `seraphim-task-${uuid()}`
  }

  return trimmedName
}

async function waitForSetupScriptCompletion(
  container: Docker.Container,
  taskId: string,
): Promise<boolean> {
  try {
    const execInstance = await container.exec({
      Cmd: [
        'bash',
        '-lc',
        [
          `while [ ! -f "${SETUP_SUCCESS_FILE}" ] && [ ! -f "${SETUP_FAILED_FILE}" ]; do`,
          'sleep 0.5;',
          'done;',
          `if [ -f "${SETUP_FAILED_FILE}" ]; then exit 1; fi`,
        ].join(' '),
      ],
      AttachStdout: true,
      AttachStderr: true,
    })

    const execStream = await execInstance.start({
      hijack: true,
      stdin: false,
    })

    if (!(execStream instanceof EventEmitter)) {
      console.debug('Setup exec stream missing event emitter support', { taskId })
      return false
    }

    await new Promise<void>((resolve, reject) => {
      execStream.on('end', resolve)
      execStream.on('close', resolve)
      execStream.on('error', reject)
    })

    const inspection = await execInstance.inspect()
    if (inspection.ExitCode === 0) {
      return true
    }

    console.debug('Setup exec reported failure', {
      taskId,
      exitCode: inspection.ExitCode,
    })
    return false
  }
  catch (error) {
    console.debug('Failed to wait for setup script completion', { taskId, error })
    return false
  }
}
