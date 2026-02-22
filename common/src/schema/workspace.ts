// Copyright © 2026 Jalapeno Labs

// Lib
import { z } from 'zod'
import { envEntrySchema } from './common'

export const workspaceCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    sourceRepoUrl: z.string().trim().min(1),
    gitBranchTemplate: z.string().trim().optional().default(''),
    customDockerfileCommands: z.string().trim().optional().default(''),
    description: z.string().trim().optional().default(''),
    setupScript: z.string().trim().optional().default(''),
    postScript: z.string().trim().optional().default(''),
    cacheFiles: z.array(z.string().trim()).optional().default([]),
    envEntries: z.array(envEntrySchema).optional().default([{ key: '', value: '' }]),
  })
  .strict()

export const workspaceUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    sourceRepoUrl: z.string().trim().min(1).optional(),
    gitBranchTemplate: z.string().trim().optional(),
    customDockerfileCommands: z.string().trim().optional(),
    description: z.string().trim().optional(),
    setupScript: z.string().trim().optional(),
    postScript: z.string().trim().optional(),
    cacheFiles: z.array(z.string().trim()).optional(),
    envEntries: z.array(envEntrySchema).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No valid fields provided for update' },
  )

export type WorkspaceCreateRequest = z.infer<typeof workspaceCreateSchema>
export type WorkspaceUpdateRequest = z.infer<typeof workspaceUpdateSchema>
