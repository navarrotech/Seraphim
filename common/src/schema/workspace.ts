// Copyright © 2026 Jalapeno Labs

// Lib
import { z } from 'zod'
import { environmentEntrySchema } from './common'

export const upsertWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1),
    sourceRepoUrl: z.string().trim().min(1),
    gitBranchTemplate: z.string().trim().optional(),
    customDockerfileCommands: z.string().trim().optional(),
    description: z.string().trim().optional(),
    setupScript: z.string().trim().optional(),
    postScript: z.string().trim().optional(),
    cacheFiles: z.array(z.string().trim()).optional(),
    envEntries: z.array(environmentEntrySchema).optional(),
  })
  .partial({
    name: true,
    sourceRepoUrl: true,
    gitBranchTemplate: true,
    customDockerfileCommands: true,
    description: true,
    setupScript: true,
    postScript: true,
    cacheFiles: true,
    envEntries: true,
  })

export type UpsertWorkspaceRequest = z.infer<typeof upsertWorkspaceSchema>
