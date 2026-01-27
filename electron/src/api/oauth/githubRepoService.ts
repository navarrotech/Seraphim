// Copyright © 2026 Jalapeno Labs

// Lib
import { Octokit } from '@octokit/core'
import { z } from 'zod'

export type GithubRepoSummary = {
  id: number
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  cloneUrl: string
  sshUrl: string
  defaultBranch: string
  ownerLogin: string
  isPrivate: boolean
  isFork: boolean
  isArchived: boolean
  updatedAt: string
}

export type GithubRepoListOptions = {
  searchQuery: string | null
  visibility: 'all' | 'private' | 'public' | null
  page: number
}

const githubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable().optional(),
  html_url: z.string(),
  clone_url: z.string(),
  ssh_url: z.string(),
  default_branch: z.string(),
  owner: z.object({
    login: z.string(),
  }),
  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  updated_at: z.string(),
})

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

function buildSearchableText(repo: GithubRepoSummary): string {
  return [
    repo.name,
    repo.fullName,
    repo.description ?? '',
    repo.ownerLogin,
  ].join(' ').toLowerCase()
}

function filterReposByQuery(
  repos: GithubRepoSummary[],
  searchQuery: string | null,
): GithubRepoSummary[] {
  const normalizedQuery = normalizeSearchQuery(searchQuery)
  if (!normalizedQuery) {
    return repos
  }

  return repos.filter(function matchRepo(repo) {
    const searchableText = buildSearchableText(repo)
    return searchableText.includes(normalizedQuery)
  })
}

function mapRepoPayloadToSummary(payload: GithubRepoPayload): GithubRepoSummary {
  return {
    id: payload.id,
    name: payload.name,
    fullName: payload.full_name,
    description: payload.description ?? null,
    htmlUrl: payload.html_url,
    cloneUrl: payload.clone_url,
    sshUrl: payload.ssh_url,
    defaultBranch: payload.default_branch,
    ownerLogin: payload.owner.login,
    isPrivate: payload.private,
    isFork: payload.fork,
    isArchived: payload.archived,
    updatedAt: payload.updated_at,
  }
}

function parseRepoPayload(payload: unknown): GithubRepoSummary | null {
  const parsed = githubRepoSchema.safeParse(payload)
  if (!parsed.success) {
    console.debug('Github repo payload failed validation', parsed.error)
    return null
  }

  return mapRepoPayloadToSummary(parsed.data)
}

export async function fetchGithubReposForAccount(
  accessToken: string,
  options: GithubRepoListOptions,
): Promise<GithubRepoSummary[] | null> {
  if (!accessToken) {
    console.debug('Github repo listing requested without an access token')
    return null
  }

  const octokit = new Octokit({ auth: accessToken })
  const perPage = 10

  let response
  try {
    response = await octokit.request('GET /user/repos', {
      per_page: perPage,
      page: options.page,
      affiliation: 'owner,collaborator,organization_member',
      sort: 'updated',
      direction: 'desc',
      visibility: options.visibility ?? undefined,
    })
  }
  catch (error) {
    console.error('Failed to fetch Github repos', error)
    return null
  }

  const payloadList = Array.isArray(response.data)
    ? response.data
    : []

  const repos: GithubRepoSummary[] = []
  payloadList.forEach(function appendRepo(payload) {
    const repo = parseRepoPayload(payload)
    if (!repo) {
      return
    }

    repos.push(repo)
  })

  return filterReposByQuery(repos, options.searchQuery)
}
