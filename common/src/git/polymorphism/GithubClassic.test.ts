// Copyright © 2026 Jalapeno Labs

import type { GitListBranchesOptions } from '../types'

// Core
import { describe, expect, it } from 'vitest'

// Misc
import { GithubClassic } from './GithubClassic'

class TestableGithubClassic extends GithubClassic {
  public async listBranchesForTest(options: GitListBranchesOptions) {
    return this.listBranches(options)
  }
}

function hasRequiredEnvValues() {
  return Boolean(
    process.env.VITEST_GITHUB_CLASSIC_TOKEN
    && process.env.VITEST_GITHUB_REPO_URL,
  )
}

function createGithubClassicClient() {
  return new TestableGithubClassic(process.env.VITEST_GITHUB_CLASSIC_TOKEN || '')
}

describe('GithubClassic', () => {
  const invalidEnvironment = !hasRequiredEnvValues()

  it('throws a friendly error when token is missing', () => {
    expect(() => new TestableGithubClassic('')).toThrow('Token is missing or empty')
  })

  it.skipIf(invalidEnvironment)('validateToken accepts classic credentials', async () => {
    const client = createGithubClassicClient()
    const validation = await client.validateToken()

    expect(validation.isValid, validation.message).toBe(true)
    expect(validation.type).toBe('Github classic')
  })

  it.skipIf(invalidEnvironment)('listBranches supports query filtering', async () => {
    const client = createGithubClassicClient()

    const allBranches = await client.listBranchesForTest({
      repoPath: process.env.VITEST_GITHUB_REPO_URL || '',
      q: '',
      page: 1,
      limit: 25,
    })

    expect(allBranches).not.toBeNull()
    if (!allBranches) {
      return
    }

    const preferredQuery = allBranches.defaultBranch || allBranches.branches[0]?.name || ''
    const query = preferredQuery.slice(0, 4)

    const filteredBranches = await client.listBranchesForTest({
      repoPath: process.env.VITEST_GITHUB_REPO_URL || '',
      q: query,
      page: 1,
      limit: 25,
    })

    expect(filteredBranches).not.toBeNull()
    if (!filteredBranches) {
      return
    }

    for (const branch of filteredBranches.branches) {
      expect(branch.name.toLowerCase()).toContain(query.toLowerCase())
    }
  })

  it.skipIf(invalidEnvironment)('listBranches can enumerate all branch pages', async () => {
    const client = createGithubClassicClient()

    const firstPage = await client.listBranchesForTest({
      repoPath: process.env.VITEST_GITHUB_REPO_URL || '',
      q: '',
      page: 1,
      limit: 25,
    })

    expect(firstPage).not.toBeNull()
    if (!firstPage) {
      return
    }

    const pageCount = Math.ceil(firstPage.totalCount / firstPage.limit)
    const branchNames = new Set(firstPage.branches.map((branch) => branch.name))

    for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
      const pageResponse = await client.listBranchesForTest({
        repoPath: process.env.VITEST_GITHUB_REPO_URL || '',
        q: '',
        page: pageNumber,
        limit: firstPage.limit,
      })

      expect(pageResponse).not.toBeNull()
      if (!pageResponse) {
        return
      }

      for (const branch of pageResponse.branches) {
        branchNames.add(branch.name)
      }
    }

    expect(branchNames.size).toBe(firstPage.totalCount)
  })
})
