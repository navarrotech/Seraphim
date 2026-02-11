// Copyright © 2026 Jalapeno Labs

// Lib
import { Octokit } from '@octokit/core'
import { z } from 'zod'

// Utility
import { Cloner } from '@common/cloning/polymorphism/cloner'

export type GithubBranchSummary = {
  name: string
  sha: string
  isProtected: boolean
}

export type GithubBranchListOptions = {
  searchQuery: string | null
  limit: number
  page: number
}

type RepoDetails = {
  defaultBranch: string | null
}

const GITHUB_BRANCH_PAGE_SIZE = 100
const MAX_GITHUB_BRANCH_PAGES = 20

const githubBranchSchema = z.object({
  name: z.string(),
  protected: z.boolean(),
  commit: z.object({
    sha: z.string(),
  }),
})

const githubRepoSchema = z.object({
  default_branch: z.string(),
})

type GithubBranchPayload = z.infer<typeof githubBranchSchema>
type GithubRepoPayload = z.infer<typeof githubRepoSchema>

function normalizeSearchQuery(searchQuery: string | null): string | null {
  if (!searchQuery) {
    return null
  }

  const trimmedQuery = searchQuery.trim()
  if (!trimmedQuery) {
    return null
  }

  return trimmedQuery.toLowerCase()
}

function parseOwnerAndRepo(repoPath: string) {
  const cloner = new Cloner(repoPath)
  const parsedRepositoryDetails = cloner.getParsedRepositoryDetails()

  if (!parsedRepositoryDetails) {
    console.debug('Github branch lookup received invalid repo path', { repoPath })
    return null
  }

  return {
    owner: parsedRepositoryDetails.owner,
    repo: parsedRepositoryDetails.repo,
  }
}

function mapBranchPayload(payload: GithubBranchPayload): GithubBranchSummary {
  return {
    name: payload.name,
    sha: payload.commit.sha,
    isProtected: payload.protected,
  }
}

function parseBranchPayload(payload: unknown): GithubBranchSummary | null {
  const parsed = githubBranchSchema.safeParse(payload)
  if (!parsed.success) {
    console.debug('Github branch payload failed validation', parsed.error)
    return null
  }

  return mapBranchPayload(parsed.data)
}

function parseRepoPayload(payload: unknown): RepoDetails | null {
  const parsed = githubRepoSchema.safeParse(payload)
  if (!parsed.success) {
    console.debug('Github repo payload failed validation', parsed.error)
    return null
  }

  const repoPayload: GithubRepoPayload = parsed.data
  return {
    defaultBranch: repoPayload.default_branch ?? null,
  }
}

function getBranchPriority(branchName: string, defaultBranch: string | null) {
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

function sortBranches(
  branches: GithubBranchSummary[],
  defaultBranch: string | null,
  searchQuery: string | null,
) {
  const normalizedSearchQuery = normalizeSearchQuery(searchQuery)

  const matchedBranches = branches.filter((branch) => {
    if (!normalizedSearchQuery) {
      return true
    }

    return branch.name.toLowerCase().includes(normalizedSearchQuery)
  })

  return matchedBranches.sort((firstBranch, secondBranch) => {
    const firstPriority = getBranchPriority(firstBranch.name, defaultBranch)
    const secondPriority = getBranchPriority(secondBranch.name, defaultBranch)

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority
    }

    return firstBranch.name.localeCompare(secondBranch.name)
  })
}

function paginateBranches(
  branches: GithubBranchSummary[],
  page: number,
  limit: number,
) {
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit

  return branches.slice(startIndex, endIndex)
}

async function fetchRepoDetails(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<RepoDetails | null> {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
    })

    return parseRepoPayload(response.data)
  }
  catch (error) {
    console.debug('Failed to fetch Github repo details', { owner, repo, error })
    return null
  }
}

async function fetchRepoBranchPage(
  octokit: Octokit,
  owner: string,
  repo: string,
  page: number,
): Promise<GithubBranchSummary[] | null> {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/branches', {
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
      const branch = parseBranchPayload(payload)
      if (!branch) {
        return
      }

      branches.push(branch)
    })

    return branches
  }
  catch (error) {
    console.debug('Failed to fetch Github branches', { owner, repo, page, error })
    return null
  }
}

async function fetchAllRepoBranches(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GithubBranchSummary[] | null> {
  const allBranches: GithubBranchSummary[] = []

  for (let page = 1; page <= MAX_GITHUB_BRANCH_PAGES; page += 1) {
    const pageBranches = await fetchRepoBranchPage(
      octokit,
      owner,
      repo,
      page,
    )

    if (!pageBranches) {
      console.debug('Failed to fetch branch page while collecting all repository branches', {
        owner,
        repo,
        page,
      })
      return null
    }

    if (pageBranches.length === 0) {
      return allBranches
    }

    allBranches.push(...pageBranches)

    if (pageBranches.length < GITHUB_BRANCH_PAGE_SIZE) {
      return allBranches
    }
  }

  console.debug('Reached maximum github branch pages while collecting repository branches', {
    owner,
    repo,
    maxPages: MAX_GITHUB_BRANCH_PAGES,
  })

  return allBranches
}

export async function fetchGithubBranchesForRepo(
  accessToken: string | null,
  repoPath: string,
  options: GithubBranchListOptions,
) {
  if (!repoPath) {
    console.debug('Github branch listing requested without repoPath')
    return null
  }

  const parsedRepoDetails = parseOwnerAndRepo(repoPath)
  if (!parsedRepoDetails) {
    return null
  }

  const octokit = new Octokit(accessToken ? { auth: accessToken } : undefined)

  const [ branches, repoInfo ] = await Promise.all([
    fetchAllRepoBranches(octokit, parsedRepoDetails.owner, parsedRepoDetails.repo),
    fetchRepoDetails(octokit, parsedRepoDetails.owner, parsedRepoDetails.repo),
  ])

  if (!branches) {
    return null
  }

  const sortedBranches = sortBranches(
    branches,
    repoInfo?.defaultBranch ?? null,
    options.searchQuery,
  )
  const paginatedBranches = paginateBranches(sortedBranches, options.page, options.limit)

  return {
    branches: paginatedBranches,
    defaultBranch: repoInfo?.defaultBranch ?? null,
    totalCount: sortedBranches.length,
    page: options.page,
    limit: options.limit,
  }
}
