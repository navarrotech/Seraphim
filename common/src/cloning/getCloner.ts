// Copyright © 2026 Jalapeno Labs

import type { AuthProvider } from '@prisma/client'

import { Cloner } from './polymorphism/cloner'
import { GithubCloner } from './polymorphism/github'

export function getCloner(authProvider: AuthProvider, sourceRepoUrl: string, token?: string): Cloner {
  if (authProvider === 'GITHUB') {
    return new GithubCloner(sourceRepoUrl, token)
  }

  console.debug('[WARNING] Using generic Cloner for auth provider', { authProvider })
  return new Cloner(sourceRepoUrl, token)
}
