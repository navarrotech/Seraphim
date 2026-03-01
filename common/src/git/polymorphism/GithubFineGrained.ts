// Copyright © 2026 Jalapeno Labs

import type { GitTokenValidation } from '../types'

// Core
import { BaseGit } from './Base'

export class GithubFineGrained extends BaseGit {
  public async validateToken(): Promise<GitTokenValidation> {
    type GitHubAuthenticatedUser = {
      login: string
      id: number
      node_id: string
      name: string | null
      email: string | null
      avatar_url: string
      html_url: string
      type: 'User' | 'Bot' | string
      site_admin: boolean

      // optional extras if you want them
      company?: string | null
      blog?: string | null
      location?: string | null
      bio?: string | null
      twitter_username?: string | null
      public_repos?: number
      public_gists?: number
      followers?: number
      following?: number
      created_at?: string
      updated_at?: string
    }

    type GitHubUserEmail = {
      email: string
      primary: boolean
      verified: boolean
      visibility: 'public' | 'private' | null
    }

    type GitHubRepoOwner = {
      login: string
      id: number
      node_id: string
      avatar_url: string
      html_url: string
      type: 'User' | 'Organization' | string
    }

    type GitHubRepository = {
      id: number
      node_id: string
      name: string
      full_name: string
      private: boolean
      owner: GitHubRepoOwner
      html_url: string
      description: string | null
      fork: boolean
      url: string
      default_branch: string
      permissions?: {
        admin: boolean
        maintain?: boolean
        push: boolean
        triage?: boolean
        pull: boolean
      }
    }

    const [ user, email, repos ] = await Promise.all([
      this.doRequest<GitHubAuthenticatedUser>('GET /user'),
      this.doRequest<GitHubUserEmail[]>('GET /user/emails'),
      this.doRequest<GitHubRepository[]>('GET /user/repos'),
    ])

    const [ userError, userResponse ] = user
    const [ emailsError, emailsResponse ] = email
    const [ reposError, reposResponse ] = repos

    if (userResponse?.status !== 200) {
      return {
        isValid: false,
        message: userError || 'GitHub fine-grained token validation failed',
        scopes: [],
        acceptedScopes: [],
        missingScopes: [],
      }
    }

    const acceptedScopes = new Set<string>()
    const missingScopes = new Set<string>()

    // /user succeeded, so auth is valid.
    acceptedScopes.add('authenticated-user')

    // List repos => Metadata:read
    if (reposResponse?.status === 200) {
      acceptedScopes.add('Metadata:read')
    }
    else {
      missingScopes.add('Metadata:read')
      console.debug('GitHub fine-grained repo probe failed', { reposError })
    }

    // Get emails => Email addresses:read
    if (emailsResponse?.status === 200) {
      acceptedScopes.add('Email addresses:read')
    }
    else {
      missingScopes.add('Email addresses:read')
      console.debug('GitHub fine-grained email probe failed', { emailsError })
    }

    if (missingScopes.size > 0) {
      return {
        isValid: false,
        message: `GitHub fine-grained token is missing required permissions: ${Array.from(missingScopes).join(', ')}`,
        username: userResponse.data.login,
        emails: emailsResponse?.data.map((e) => e.email) || [],
        scopes: Array.from(acceptedScopes),
        acceptedScopes: Array.from(acceptedScopes),
        missingScopes: Array.from(missingScopes),
      }
    }

    return {
      isValid: true,
      message: 'GitHub fine-grained token is valid',
      username: userResponse.data.login,
      emails: emailsResponse?.data.map((e) => e.email) || [],
      scopes: Array.from(acceptedScopes),
      acceptedScopes: Array.from(acceptedScopes),
      missingScopes: [],
    }
  }
}
