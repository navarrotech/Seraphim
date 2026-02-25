// Copyright © 2026 Jalapeno Labs

// Lib
import { z } from 'zod'
import { environmentEntrySchema } from './common'

export const upsertWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    sourceRepoUrl: z.string().trim().min(1).optional(),
    gitBranchTemplate: z.string().trim().optional(),
    customDockerfileCommands: z.string().trim().optional(),
    description: z.string().trim().optional(),
    setupScript: z.string().trim().optional(),
    postScript: z.string().trim().optional(),
    cacheFiles: z.array(z.string().trim()).optional(),
    envEntries: z.array(environmentEntrySchema).optional(),
  })

export type UpsertWorkspaceRequest = z.infer<typeof upsertWorkspaceSchema>
