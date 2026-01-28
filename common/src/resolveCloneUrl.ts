// Copyright © 2026 Jalapeno Labs

import type { ExecFileOptions } from 'node:child_process'

// Core
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

// Misc
import { maskToken } from './maskToken.js'
import { buildGithubCloneUrl, resolveGithubRepoPath } from './resolveGithubRepoPath.js'

const execFileAsync = promisify(execFile)

export type CloneResolution = {
  cloneUrl: string
  usingToken: boolean
}

async function canCloneRepo(url: string, context: string) {
  const options: ExecFileOptions = {
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    },
    timeout: 15000,
  }

  try {
    await execFileAsync('git', [ 'ls-remote', url, 'HEAD' ], options)
    return true
  }
  catch (error) {
    console.debug('Git clone probe failed', { context, error })
    return false
  }
}

export async function resolveCloneUrl(
  repository: string,
  githubTokens: string[],
): Promise<CloneResolution | null> {
  const repoPath = resolveGithubRepoPath(repository)
  if (!repoPath) {
    console.debug('Repository is not a supported GitHub clone URL', { repository })
    return null
  }

  const publicUrl = buildGithubCloneUrl(repoPath)
  if (!publicUrl) {
    console.debug('Failed to build public GitHub clone URL', { repository })
    return null
  }

  const canClonePublic = await canCloneRepo(publicUrl, 'public')
  if (canClonePublic) {
    return {
      cloneUrl: publicUrl,
      usingToken: false,
    }
  }

  for (const token of githubTokens) {
    const tokenUrl = buildGithubCloneUrl(repoPath, token)
    const maskedToken = maskToken(token)
    if (!tokenUrl) {
      console.debug('Failed to build token GitHub clone URL', {
        repository,
        token: maskedToken,
      })
      continue
    }

    const canClonePrivate = await canCloneRepo(tokenUrl, `token:${maskedToken}`)
    if (canClonePrivate) {
      return {
        cloneUrl: tokenUrl,
        usingToken: true,
      }
    }
  }

  console.debug('No GitHub token could authenticate the repository clone', {
    repository,
  })
  return null
}
