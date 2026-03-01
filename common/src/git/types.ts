// Copyright © 2026 Jalapeno Labs

import type { Octokit } from '@octokit/core'

type OctokitRequestResult<Shape> = Omit<Awaited<ReturnType<Octokit['request']>>, 'data'> & {
  data: Shape
}

export type RequestResult<Shape> = [
  string,
  OctokitRequestResult<Shape> | null
]

export type GitTokenValidation = {
  isValid: boolean
  message?: string
  username?: string
  emails?: string[]
  scopes: string[]
  acceptedScopes: string[]
  missingScopes: string[]
}
