// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { IssueTrackingProvider } from '@prisma/client'

export const createIssueTrackingAccountSchema = z
  .object({
    name: z.string().trim().min(1),
    provider: z.nativeEnum(IssueTrackingProvider),
    baseUrl: z.string().trim().url(),
    email: z.string().trim().email(),
    accessToken: z.string().trim().min(1),
  })
  .strict()
export type CreateIssueTrackingAccountRequest = z.infer<typeof createIssueTrackingAccountSchema>

export const updateIssueTrackingAccountSchema = createIssueTrackingAccountSchema
  .omit({ provider: true })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one editable account field is required',
  })
export type UpdateIssueTrackingAccountRequest = z.infer<typeof updateIssueTrackingAccountSchema>
