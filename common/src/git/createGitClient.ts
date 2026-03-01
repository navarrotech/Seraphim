// Copyright © 2026 Jalapeno Labs

import type { BaseGit } from './polymorphism/Base'

import { GithubClassic } from './polymorphism/GithubClassic'
import { GithubFineGrained } from './polymorphism/GithubFineGrained'

export function createGitClient(token: string): BaseGit {
  const normalizedToken = token.trim()

  if (!normalizedToken) {
    throw new Error('Git token is missing or empty.')
  }

  // Heuristic: If the token starts with "github_pat_" it's a fine-grained token, otherwise it's classic.
  if (normalizedToken.startsWith('github_pat_')) {
    return new GithubFineGrained(normalizedToken)
  }
  else if (normalizedToken.startsWith('ghp_')) {
    // Normally starts with 'ghp_'
    return new GithubClassic(normalizedToken)
  }

  // Other token types also have their own prefixes, like gho_, ghu_, ghs_, and ghr_.
  throw new Error(
    'Unsupported GitHub token type. Expected a classic PAT (ghp_) or fine-grained PAT (github_pat_).',
  )
}
