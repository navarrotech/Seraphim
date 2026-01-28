// Copyright © 2026 Jalapeno Labs

export function normalizeRepoPath(repoPath: string) {
  let cleaned = repoPath?.trim()
  if (!cleaned) {
    console.debug('normalizeRepoPath empty or undefined')
    return null
  }

  if (cleaned.endsWith('.git')) {
    cleaned = cleaned.slice(0, -4)
  }

  return cleaned
}

export function buildGithubCloneUrl(repoPath: string, token?: string) {
  if (!repoPath) {
    console.debug('buildGithubCloneUrl received empty repoPath')
    return null
  }

  if (token) {
    return `https://x-access-token:${token}@github.com/${repoPath}.git`
  }

  return `https://github.com/${repoPath}.git`
}

export function resolveGithubRepoPath(repository: string) {
  const trimmed = repository?.trim()
  if (!trimmed) {
    console.debug('resolveGithubRepoPath received empty repository')
    return null
  }

  if (trimmed.startsWith('git@github.com:')) {
    const repoPath = trimmed.replace('git@github.com:', '')
    return normalizeRepoPath(repoPath)
  }

  if (trimmed.startsWith('https://github.com/') || trimmed.startsWith('http://github.com/')) {
    try {
      const parsed = new URL(trimmed)

      return normalizeRepoPath(
        parsed.pathname.replace(/^\/+/, ''),
      )
    }
    catch (error) {
      console.debug('Failed to parse repository URL', { repository, error })
      return null
    }
  }

  console.debug('resolveGithubRepoPath received unsupported repository URL', { repository })
  return null
}
