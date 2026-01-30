// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { GithubRepoSummary } from '@electron/api/oauth/githubRepoService'

// Lib
import { z } from 'zod'

// Utility
import { requireDatabaseClient } from '@electron/database'
import { fetchGithubReposForAccount } from '@electron/api/oauth/githubRepoService'
import { parseRequestParams, parseRequestQuery } from '../../validation'
import { resolveSearchQuery } from '../../utils/searchQuery'

const repoQuerySchema = z.object({
  q: z.string().trim().optional(),
  search: z.string().trim().optional(),
  visibility: z.enum([ 'all', 'private', 'public' ]).optional(),
  page: z.string().trim().optional(),
})

type RepoQuery = z.infer<typeof repoQuerySchema>

const repoParamsSchema = z.object({
  githubUsername: z.string().trim().min(1),
})

type RepoParams = z.infer<typeof repoParamsSchema>

type RepoAccountResult = {
  accountId: string
  username: string
  displayName: string
  email: string | null
  repos: GithubRepoSummary[]
}

type RepoAccountFailure = {
  accountId: string
  username: string
  error: string
}

function resolvePage(query: RepoQuery): number | null {
  const rawPage = query.page ?? '1'
  const parsedPage = Number(rawPage)

  if (!Number.isFinite(parsedPage) || parsedPage % 1 !== 0 || parsedPage <= 0) {
    console.debug('Invalid repo page query', { rawPage })
    return null
  }

  return parsedPage
}

export async function handleListReposRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const query = parseRequestQuery(
    repoQuerySchema,
    request,
    response,
    {
      context: 'List Github repos',
      errorMessage: 'Invalid repo query',
    },
  )

  if (!query) {
    console.debug('List Github repos request failed validation')
    return
  }

  let params: RepoParams | null = null
  if (request.params?.githubUsername) {
    params = parseRequestParams(
      repoParamsSchema,
      request,
      response,
      {
        context: 'List Github repos',
        errorMessage: 'Invalid Github account username',
      },
    )

    if (!params) {
      console.debug('List Github repos request failed param validation')
      return
    }
  }

  const databaseClient = requireDatabaseClient('List Github repos')

  let accounts
  if (params) {
    accounts = await databaseClient.authAccount.findMany({
      where: {
        provider: 'GITHUB',
        username: params.githubUsername,
      },
    })
  }
  else {
    accounts = await databaseClient.authAccount.findMany({
      where: { provider: 'GITHUB' },
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!accounts || accounts.length === 0) {
    console.debug('No Github accounts available for repo listing', {
      username: params?.githubUsername ?? null,
    })
    response.status(404).json({ error: 'No Github accounts available' })
    return
  }

  const searchQuery = resolveSearchQuery(query)
  const visibility = query.visibility ?? null
  const page = resolvePage(query)

  if (!page) {
    response.status(400).json({ error: 'Invalid page value' })
    return
  }

  const results: RepoAccountResult[] = []
  const failures: RepoAccountFailure[] = []

  for (const account of accounts) {
    const repos = await fetchGithubReposForAccount(account.accessToken, {
      searchQuery,
      visibility,
      page,
    })

    if (!repos) {
      failures.push({
        accountId: account.id,
        username: account.username,
        error: 'Failed to fetch repositories',
      })
      continue
    }

    results.push({
      accountId: account.id,
      username: account.username,
      displayName: account.displayName,
      email: account.email,
      repos,
    })
  }

  response.status(200).json({
    results,
    failures,
  })
}
