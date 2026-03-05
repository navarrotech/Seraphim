// Copyright © 2026 Jalapeno Labs

import type {
  RequestResult,
  GitTokenValidation,
  GitListBranchesOptions,
  GitListBranchesResult,
} from '../types'
import type { GithubBranchSummary } from '@common/types'
import type { GithubRepoPayload } from '../schema'

// Lib
import { Octokit } from '@octokit/core'
import { RequestError } from '@octokit/request-error'

// Utility
import { Cloner } from '@common/cloning/polymorphism/cloner'
import { githubBranchSchema, githubRepoSchema } from '../schema'

const GITHUB_BRANCH_PAGE_SIZE = 100

type RepoDetails = {
  defaultBranch: string | null
}

type RepoBranchPage = {
  branches: GithubBranchSummary[]
  hasNextPage: boolean
}

export class BaseGit {
  protected readonly token: string
  protected readonly octokit: Octokit

  // ////////////////////////////// //
  //              Core              //
  // ////////////////////////////// //

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

  // ////////////////////////////// //
  //        Listing branches        //
  // ////////////////////////////// //

  public async listBranches(
    options: GitListBranchesOptions,
  ): Promise<GitListBranchesResult | null> {
    const cloner = new Cloner(options.repoPath)
    const repo = cloner.getParsedRepositoryDetails()
    if (!repo) {
      return null
    }

    const [ branches, repoInfo ] = await Promise.all([
      this.fetchAllRepoBranches(repo.owner, repo.repo),
      this.fetchRepoDetails(repo.owner, repo.repo),
    ])

    if (!branches) {
      return null
    }

    const sortedBranches = this.sortBranches(
      branches,
      repoInfo?.defaultBranch ?? null,
      options.q,
    )
    const paginatedBranches = this.paginateBranches(
      sortedBranches,
      options.page,
      options.limit,
    )

    return {
      branches: paginatedBranches,
      defaultBranch: repoInfo?.defaultBranch ?? null,
      totalCount: sortedBranches.length,
      page: options.page,
      limit: options.limit,
    }
  }

  protected getBranchPriority(branchName: string, defaultBranch: string | null) {
    const normalizedBranchName = branchName.toLowerCase()

    if (defaultBranch && normalizedBranchName === defaultBranch.toLowerCase()) {
      return 0
    }

    if (normalizedBranchName === 'main') {
      return 1
    }

    if (normalizedBranchName === 'master') {
      return 2
    }

    if (normalizedBranchName === 'develop' || normalizedBranchName === 'devel') {
      return 3
    }

    if (normalizedBranchName === 'dev') {
      return 4
    }

    if (normalizedBranchName === 'staging') {
      return 5
    }

    if (normalizedBranchName === 'production' || normalizedBranchName === 'prod') {
      return 6
    }

    if (normalizedBranchName.startsWith('release/')) {
      return 7
    }

    if (normalizedBranchName.startsWith('hotfix/')) {
      return 8
    }

    return 100
  }

  protected sortBranches(
    branches: GithubBranchSummary[],
    defaultBranch: string | null,
    searchQueryRaw?: string | null,
  ) {
    const searchQuery = searchQueryRaw?.trim()?.toLowerCase()

    const matchedBranches = branches.filter((branch) => {
      if (!searchQuery) {
        return true
      }

      return branch.name.toLowerCase().includes(searchQuery)
    })

    return matchedBranches.sort((firstBranch, secondBranch) => {
      const firstPriority = this.getBranchPriority(firstBranch.name, defaultBranch)
      const secondPriority = this.getBranchPriority(secondBranch.name, defaultBranch)

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority
      }

      return firstBranch.name.localeCompare(secondBranch.name)
    })
  }

  protected paginateBranches(
    branches: GithubBranchSummary[],
    page: number,
    limit: number,
  ) {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    return branches.slice(startIndex, endIndex)
  }

  protected async fetchRepoDetails(
    owner: string,
    repo: string,
  ): Promise<RepoDetails | null> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      })

      const parsed = githubRepoSchema.safeParse(response.data)
      if (!parsed.success) {
        console.debug('Github repo payload failed validation', parsed.error)
        return null
      }

      return {
        defaultBranch: (parsed.data as GithubRepoPayload)?.default_branch ?? null,
      }
    }
    catch (error) {
      console.debug('Failed to fetch Github repo details', { owner, repo, error })
      return null
    }
  }

  protected async fetchRepoBranchPage(
    owner: string,
    repo: string,
    page: number,
  ): Promise<RepoBranchPage | null> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/branches', {
        owner,
        repo,
        page,
        per_page: GITHUB_BRANCH_PAGE_SIZE,
      })

      const payloadList = Array.isArray(response.data)
        ? response.data
        : []

      const branches: GithubBranchSummary[] = []
      payloadList.forEach((payload) => {
        const parsed = githubBranchSchema.safeParse(payload)
        if (!parsed.success) {
          console.debug('Github branch payload failed validation', parsed.error)
          return
        }

        const branch: GithubBranchSummary = {
          name: parsed.data.name,
          sha: parsed.data.commit.sha,
          isProtected: parsed.data.protected,
        }

        branches.push(branch)
      })

      const linkHeader = response.headers.link
      const hasNextPage = typeof linkHeader === 'string'
        && linkHeader.includes('rel="next"')

      return {
        branches,
        hasNextPage,
      }
    }
    catch (error) {
      console.debug('Failed to fetch Github branches', { owner, repo, page, error })
      return null
    }
  }

  protected async fetchAllRepoBranches(
    owner: string,
    repo: string,
  ): Promise<GithubBranchSummary[] | null> {
    const allBranches: GithubBranchSummary[] = []
    let page = 1

    while (true) {
      const pageResponse = await this.fetchRepoBranchPage(owner, repo, page)

      if (!pageResponse) {
        console.debug('Failed to fetch branch page while collecting all repository branches', {
          owner,
          repo,
          page,
        })
        return null
      }

      allBranches.push(...pageResponse.branches)

      if (!pageResponse.hasNextPage) {
        return allBranches
      }

      page += 1
    }
  }
}
