// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { IssueTrackingProvider } from '@prisma/client'

export const upsertIssueTrackingSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    provider: z.nativeEnum(IssueTrackingProvider),
    baseUrl: z.string().trim().url().optional(),
    email: z.string().trim().email().optional(),
    accessToken: z.string().trim().min(1).optional(),
    targetBoard: z.string().trim().min(1).optional(),
  })

export type UpsertIssueTrackingRequest = z.infer<typeof upsertIssueTrackingSchema>
