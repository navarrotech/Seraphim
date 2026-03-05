// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Core
import { createGitClient } from '@common/git/createGitClient'

// Lib
import { z } from 'zod'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { parseRequestQuery } from '../../validation'
import { resolveSearchQuery } from '../../utils/searchQuery'

const branchQuerySchema = z.object({
  workspaceId: z.string().trim().min(1),
  gitAccountId: z.string().trim().min(1),
  q: z.string().trim().optional(),
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

  const gitAccount = await databaseClient.gitAccount.findFirst({
    where: {
      id: query.gitAccountId,
      provider: 'GITHUB',
    },
  })

  if (!gitAccount) {
    console.debug('List Github branches could not find git account', {
      gitAccountId: query.gitAccountId,
    })
    response.status(404).json({ error: 'Git account not found' })
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

  const accessToken = gitAccount.accessToken?.trim()
  if (!accessToken) {
    console.debug('List Github branches could not find a usable token on git account', {
      gitAccountId: gitAccount.id,
    })
    response.status(400).json({ error: 'Git account token is required' })
    return
  }

  const gitClient = createGitClient(accessToken)

  const branchResponse = await gitClient.listBranches({
    repoPath: sourceRepoUrl,
    q: searchQuery,
    page,
    limit,
  })

  if (!branchResponse) {
    console.debug('List Github branches failed to fetch branch data', {
      workspaceId: workspace.id,
      gitAccountId: gitAccount.id,
      sourceRepoUrl,
    })
    response.status(502).json({ error: 'Failed to fetch branches from GitHub' })
    return
  }

  response.status(200).json({
    workspaceId: workspace.id,
    gitAccountId: gitAccount.id,
    repoPath: sourceRepoUrl,
    defaultBranch: branchResponse.defaultBranch,
    branches: branchResponse.branches,
    totalCount: branchResponse.totalCount,
    page: branchResponse.page,
    limit: branchResponse.limit,
  })
}
