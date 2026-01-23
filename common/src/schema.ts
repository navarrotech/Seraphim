// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'

export const environmentSchema = z.object({
  key: z
    .string()
    .max(256),
  value: z
    .string()
    .max(2048),
})

export type Environment = z.infer<typeof environmentSchema>

export const workspaceEnvEntrySchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(256),
  value: z
    .string()
    .trim()
    .min(1)
    .max(2048),
})

export const workspaceCreateSchema = z.object({
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
  containerImage: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  setupScript: z.string().trim().optional().default(''),
  postScript: z.string().trim().optional().default(''),
  cacheFiles: z.array(z.string().trim()).optional().default([]),
  envEntries: z.array(workspaceEnvEntrySchema).optional().default([]),
}).strict()

export const workspaceUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  repository: z.string().trim().min(1).optional(),
  containerImage: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  setupScript: z.string().trim().optional(),
  postScript: z.string().trim().optional(),
  cacheFiles: z.array(z.string().trim()).optional(),
  envEntries: z.array(workspaceEnvEntrySchema).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
})

export const taskCreateSchema = z.object({
  userId: z.string().trim().min(1),
  workspaceId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  branch: z.string().trim().min(1),
  container: z.string().trim().min(1),
  archived: z.boolean().optional().default(false),
}).strict()

export const taskUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  branch: z.string().trim().min(1).optional(),
  container: z.string().trim().min(1).optional(),
  archived: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
})

export type WorkspaceEnvEntry = z.infer<typeof workspaceEnvEntrySchema>
export type WorkspaceCreateRequest = z.infer<typeof workspaceCreateSchema>
export type WorkspaceUpdateRequest = z.infer<typeof workspaceUpdateSchema>
export type TaskCreateRequest = z.infer<typeof taskCreateSchema>
export type TaskUpdateRequest = z.infer<typeof taskUpdateSchema>
