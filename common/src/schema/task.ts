// Copyright © 2026 Jalapeno Labs

// Lib
import { z } from 'zod'

export const taskCreateSchema = z
  .object({
    userId: z.string().trim().min(1),
    workspaceId: z.string().trim().min(1),
    authAccountId: z.string().trim().min(1),
    llmId: z.string().trim().min(1),
    message: z.string().trim().min(1),
    branch: z.string().trim().min(1),
    issueLink: z.string().optional(),
    archived: z.boolean().optional().default(false),
  })
  .strict()

export const taskUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
    container: z.string().trim().min(1).optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No valid fields provided for update' },
  )

export type TaskCreateRequest = z.infer<typeof taskCreateSchema>
export type TaskUpdateRequest = z.infer<typeof taskUpdateSchema>
