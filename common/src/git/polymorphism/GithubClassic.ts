// Copyright © 2026 Jalapeno Labs

import type { GitTokenValidation } from '../types'

// Core
import { BaseGit } from './Base'

// Misc
import { GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES } from '@common/constants'

export class GithubClassic extends BaseGit {
  // The default implementation is based on the classic token apprpoach.
  public async validateToken(): Promise<GitTokenValidation> {
    const [ errorMessage, response ] = await this.doRequest<{
      login: string
      email?: string
    }>('GET /user')

    if (response?.status !== 200) {
      return {
        isValid: false,
        message: errorMessage || 'GitHub token validation failed',
        type: 'Github classic',
        scopes: [],
        acceptedScopes: [],
        missingScopes: [],
      }
    }

    const grantedScopeSet = this.headerToSet(
      response.headers['x-oauth-scopes'],
    )
    const acceptedScopes = this.headerToSet(
      response.headers['x-accepted-oauth-scopes'],
    )

    // ///////////////////////////// //
    //          Check scopes         //
    // ///////////////////////////// //

    const missingScopes = new Set<string>()

    for (const requiredScope of GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES) {
      if (!grantedScopeSet.has(requiredScope)) {
        missingScopes.add(requiredScope)
      }
    }

    // 'user' scope implies both 'read:user' and 'user:email'
    if (grantedScopeSet.has('user')) {
      missingScopes.delete('read:user')
      missingScopes.delete('user:email')
    }

    if (missingScopes.size > 0) {
      return {
        isValid: false,
        message: `GitHub token is missing required scopes: ${Array.from(missingScopes).join(', ')}`,
        type: 'Github classic',
        username: response.data.login,
        emails: [ response.data.email ].filter(Boolean),
        scopes: Array.from(grantedScopeSet),
        acceptedScopes: Array.from(acceptedScopes),
        missingScopes: Array.from(missingScopes),
      }
    }

    return {
      isValid: true,
      message: 'GitHub token is valid',
      type: 'Github classic',
      username: response.data.login,
      emails: [ response.data.email ].filter(Boolean),
      scopes: Array.from(grantedScopeSet),
      acceptedScopes: Array.from(acceptedScopes),
      missingScopes: [],
    }
  }
}
