// Copyright © 2026 Jalapeno Labs

// Core
import { execFileAsync } from '../../node/execFileAsync'


export type ParsedRepositoryDetails = {
  owner: string
  repo: string
}

// Polymorophism!
// Github and other types can get their own extensions of this class
export class Cloner {
  public readonly sourceRepoUrl: string
  public readonly token?: string

  // Extracted details:
  protected orgName?: string
  protected repoName?: string

  constructor(
    sourceRepoUrl: string,
    token?: string,
  ) {
    this.sourceRepoUrl = sourceRepoUrl?.trim()
    this.token = token?.trim()

    this.extractRepoDetails()
  }

  protected extractRepoDetails(): void {
    const url = this.sourceRepoUrl

    // All incoming types of urls:
    // git@github.com:navarrotech/Seraphim.git
    // git@github.com/org/repo.git (slash, not colon)
    // ssh://git@github.com/org/repo.git
    // Enterprise hosts (git@github.company.com:org/repo.git)
    // https://github.com/navarrotech/Seraphim.git

    const setFromPath = (path: string) => {
      const parts = path
        .replace(/^\/+/, '') // Remove one or more leading slashes
        .replace(/\/+$/, '') // Remove one or more trailing slashes
        .replace(/\.git$/, '') // Remove .git suffix
        .split('/')
        .filter(Boolean)

      // expect owner/repo
      if (parts.length < 2) {
        console.debug('Repository URL/path missing owner or repo', { repository: url })
        return
      }

      this.orgName = parts[0]
      this.repoName = parts[1]
    }

    // SSH scp-like: git@github.com:owner/repo(.git) OR git@github.com/owner/repo(.git)
    const sshMatch = url.match(/^git@github\.com[:/](.+)$/)
    if (sshMatch) {
      setFromPath(sshMatch[1])
      return
    }

    // ssh://git@github.com/owner/repo(.git)
    if (url.startsWith('ssh://')) {
      try {
        const parsed = new URL(url)
        if (parsed.hostname !== 'github.com') {
          console.debug('Unsupported git host', { repository: url, host: parsed.hostname })
          return
        }
        setFromPath(parsed.pathname)
      }
      catch (error) {
        console.debug('Failed to parse repository URL', { repository: url, error })
      }
      return
    }

    // http(s)://github.com/owner/repo(.git) or web URLs with extra segments
    if (url.startsWith('https://') || url.startsWith('http://')) {
      try {
        const parsed = new URL(url)
        if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
          console.debug('Unsupported git host', { repository: url, host: parsed.hostname })
          return
        }
        setFromPath(parsed.pathname)
      }
      catch (error) {
        console.debug('Failed to parse repository URL', { repository: url, error })
      }
      return
    }

    if (url.includes('/')) {
      // Try to extract from any URL that contains a slash, taking the last two segments
      setFromPath(url)
      return
    }

    console.debug('Received unsupported repository URL (don\'t know how to format it)', { repository: url })
  }

  public getCloneUrl(): string {
    return this.sourceRepoUrl
  }

  public getParsedRepositoryDetails(): ParsedRepositoryDetails | null {
    const owner = this.orgName?.trim()
    const repo = this.repoName?.trim()

    if (!owner || !repo) {
      console.debug('Cloner was unable to resolve repository owner and name from source url', {
        sourceRepoUrl: this.sourceRepoUrl,
        owner: this.orgName ?? null,
        repo: this.repoName ?? null,
      })
      return null
    }

    return {
      owner,
      repo,
    }
  }

  public async checkIfCanClone(): Promise<boolean> {
    const cloneUrl = this.getCloneUrl()

    try {
      await execFileAsync(
        'git', [ 'ls-remote', cloneUrl, 'HEAD' ],
        {
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0',
          },
          timeout: 15_000,
        },
      )

      return true
    }
    catch (error) {
      console.debug('Git clone probe failed', error)
    }

    return false
  }
}
