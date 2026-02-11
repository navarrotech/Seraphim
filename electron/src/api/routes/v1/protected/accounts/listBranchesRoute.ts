// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Lib
import { z } from 'zod'

// Utility
import { fetchGithubBranchesForRepo } from '@electron/api/oauth/githubBranchService'
import { requireDatabaseClient } from '@electron/database'
import { parseRequestQuery } from '../../validation'
import { resolveSearchQuery } from '../../utils/searchQuery'

const branchQuerySchema = z.object({
  workspaceId: z.string().trim().min(1),
  authAccountId: z.string().trim().min(1),
  q: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.string().trim().optional(),
  limit: z.string().trim().optional(),
})

type BranchQuery = z.infer<typeof branchQuerySchema>

function resolvePage(query: BranchQuery) {
  const rawPage = query.page ?? '1'
  const parsedPage = Number(rawPage)

  if (!Number.isFinite(parsedPage) || parsedPage % 1 !== 0 || parsedPage <= 0) {
    console.debug('List Github branches received an invalid page query', {
      rawPage,
    })
    return null
  }

  return parsedPage
}

function resolveLimit(query: BranchQuery) {
  const rawLimit = query.limit ?? '30'
  const parsedLimit = Number(rawLimit)

  if (!Number.isFinite(parsedLimit) || parsedLimit % 1 !== 0 || parsedLimit <= 0) {
    console.debug('List Github branches received an invalid limit query', {
      rawLimit,
    })
    return null
  }

  return Math.min(parsedLimit, 100)
}

export async function handleListBranchesRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const query = parseRequestQuery(
    branchQuerySchema,
    request,
    response,
    {
      context: 'List Github branches',
      errorMessage: 'Invalid branch query',
    },
  )

  if (!query) {
    console.debug('List Github branches request failed query validation')
    return
  }

  const page = resolvePage(query)
  if (!page) {
    response.status(400).json({ error: 'Invalid page value' })
    return
  }

  const limit = resolveLimit(query)
  if (!limit) {
    response.status(400).json({ error: 'Invalid limit value' })
    return
  }

  const databaseClient = requireDatabaseClient('List Github branches')

  const authAccount = await databaseClient.authAccount.findFirst({
    where: {
      id: query.authAccountId,
      provider: 'GITHUB',
    },
  })

  if (!authAccount) {
    console.debug('List Github branches could not find github auth account', {
      authAccountId: query.authAccountId,
    })
    response.status(404).json({ error: 'Auth account not found' })
    return
  }

  const workspace = await databaseClient.workspace.findUnique({
    where: { id: query.workspaceId },
  })

  if (!workspace) {
    console.debug('List Github branches could not find workspace', {
      workspaceId: query.workspaceId,
    })
    response.status(404).json({ error: 'Workspace not found' })
    return
  }

  const sourceRepoUrl = workspace.sourceRepoUrl?.trim()
  if (!sourceRepoUrl) {
    console.debug('List Github branches workspace has no source repository configured', {
      workspaceId: workspace.id,
    })
    response.status(400).json({ error: 'Workspace repository is required' })
    return
  }

  const searchQuery = resolveSearchQuery(query)

  const branchResponse = await fetchGithubBranchesForRepo(
    authAccount.accessToken,
    sourceRepoUrl,
    {
      searchQuery,
      page,
      limit,
    },
  )

  if (!branchResponse) {
    console.debug('List Github branches failed to fetch branch data', {
      workspaceId: workspace.id,
      authAccountId: authAccount.id,
      sourceRepoUrl,
    })
    response.status(502).json({ error: 'Failed to fetch branches from GitHub' })
    return
  }

  response.status(200).json({
    workspaceId: workspace.id,
    authAccountId: authAccount.id,
    repoPath: sourceRepoUrl,
    defaultBranch: branchResponse.defaultBranch,
    branches: branchResponse.branches,
    totalCount: branchResponse.totalCount,
    page: branchResponse.page,
    limit: branchResponse.limit,
  })
}
