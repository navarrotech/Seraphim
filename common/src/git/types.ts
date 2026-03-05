// Copyright © 2026 Jalapeno Labs

import type { Octokit } from '@octokit/core'
import type {
  GithubBranchSummary,
  StandardUrlParams,
  StandardPaginatedResponseData,
} from '@common/types'

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
  type: 'Github classic' | 'Github fine-grained' | 'Unknown'
  username?: string
  emails?: string[]
  scopes: string[]
  acceptedScopes: string[]
  missingScopes: string[]
}

export type GitListBranchesOptions = Required<StandardUrlParams> & {
  repoPath: string
}

export type GitListBranchesResult = StandardPaginatedResponseData & {
  branches: GithubBranchSummary[]
  defaultBranch: string | null
}
