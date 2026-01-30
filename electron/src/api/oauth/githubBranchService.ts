// Copyright © 2026 Jalapeno Labs

// Lib
import { Octokit } from '@octokit/core'
import { z } from 'zod'

export type GithubBranchSummary = {
  name: string
  sha: string
  isProtected: boolean
}

export type GithubBranchListOptions = {
  searchQuery: string | null
  limit: number
}

type RepoDetails = {
  defaultBranch: string | null
}

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

  const trimmed = searchQuery.trim()
  if (!trimmed) {
    return null
  }

  return trimmed.toLowerCase()
}

function filterBranchesByQuery(
  branches: GithubBranchSummary[],
  searchQuery: string | null,
) {
  const normalizedQuery = normalizeSearchQuery(searchQuery)
  if (!normalizedQuery) {
    return branches
  }

  return branches.filter((branch) => branch.name.toLowerCase().includes(normalizedQuery))
}

function parseOwnerAndRepo(repoPath: string) {
  const [ owner, repo ] = repoPath.split('/')
  if (!owner || !repo) {
    console.debug('Github branch lookup received invalid repo path', { repoPath })
    return null
  }

  return { owner, repo }
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

async function fetchRepoBranches(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GithubBranchSummary[] | null> {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/branches', {
      owner,
      repo,
      per_page: 100,
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
    console.debug('Failed to fetch Github branches', { owner, repo, error })
    return null
  }
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

  const repoDetails = parseOwnerAndRepo(repoPath)
  if (!repoDetails) {
    return null
  }

  const octokit = new Octokit(accessToken ? { auth: accessToken } : undefined)

  const [ branches, repoInfo ] = await Promise.all([
    fetchRepoBranches(octokit, repoDetails.owner, repoDetails.repo),
    fetchRepoDetails(octokit, repoDetails.owner, repoDetails.repo),
  ])

  if (!branches) {
    return null
  }

  const filteredBranches = filterBranchesByQuery(branches, options.searchQuery)

  return {
    branches: filteredBranches.slice(0, options.limit),
    defaultBranch: repoInfo?.defaultBranch ?? null,
  }
}
