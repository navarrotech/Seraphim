// Copyright © 2026 Jalapeno Labs

// Lib
import { z } from 'zod'

export const githubBranchSchema = z.object({
  name: z.string(),
  protected: z.boolean(),
  commit: z.object({
    sha: z.string(),
  }),
})

export const githubRepoSchema = z.object({
  default_branch: z.string(),
})

export type GithubBranchPayload = z.infer<typeof githubBranchSchema>
export type GithubRepoPayload = z.infer<typeof githubRepoSchema>
