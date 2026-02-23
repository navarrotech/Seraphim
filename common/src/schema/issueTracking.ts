// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { IssueTrackingProvider } from '@prisma/client'

export const createIssueTrackingSchema = z
  .object({
    name: z.string().trim().min(1),
    provider: z.nativeEnum(IssueTrackingProvider),
    baseUrl: z.string().trim().url(),
    email: z.string().trim().email(),
    accessToken: z.string().trim().min(1),
    targetBoard: z.string().trim().min(1),
  })
  .strict()
export type CreateIssueTrackingRequest = z.infer<typeof createIssueTrackingSchema>

export const updateIssueTrackingSchema = createIssueTrackingSchema
  .omit({ provider: true })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one editable account field is required',
  })
export type UpdateIssueTrackingRequest = z.infer<typeof updateIssueTrackingSchema>
