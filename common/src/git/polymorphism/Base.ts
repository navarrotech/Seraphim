// Copyright © 2026 Jalapeno Labs

import type { RequestResult, GitTokenValidation } from '../types'

import { Octokit } from '@octokit/core'
import { RequestError } from '@octokit/request-error'

export class BaseGit {
  protected readonly token: string
  protected readonly octokit: Octokit

  constructor(token: string) {
    this.token = token.trim()
    if (!this.token) {
      throw new Error('BaseGit: Token is missing or empty.')
    }

    this.octokit = new Octokit({
      auth: this.token,
    })
  }

  public async validateToken(): Promise<GitTokenValidation> {
    throw new Error('validateToken method not implemented for the base Git type.')
  }

  protected async doRequest<Shape>(command: string): Promise<RequestResult<Shape>> {
    try {
      const response = await this.octokit.request(command, {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })

      return [ '', response ] as const
    }
    catch (error) {
      if (error instanceof RequestError) {
        if (error.status === 401) {
          return [ 'Bad credentials: GitHub token is invalid', null ] as const
        }
      }

      console.debug('GitHub token validation request failed', { error })

      return [ 'GitHub token failed validation', null ] as const
    }
  }

  protected headerToSet(headerValue: string | number | null): Set<string> {
    if (!headerValue) {
      return new Set()
    }

    const headerString = String(headerValue)
    const items = headerString
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    return new Set(items)
  }
}
