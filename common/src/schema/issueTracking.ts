// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { IssueTrackingProvider } from '@prisma/client'

export const upsertIssueTrackingSchema = z
  .object({
    name: z.string().trim().min(1),
    provider: z.nativeEnum(IssueTrackingProvider),
    baseUrl: z.string().trim().url().optional(),
    email: z.string().trim().email(),
    accessToken: z.string().trim().min(1),
    targetBoard: z.string().trim().min(1),
  })
  .partial({
    name: true,
    baseUrl: true,
    email: true,
    accessToken: true,
    targetBoard: true,
  })

export type UpsertIssueTrackingRequest = z.infer<typeof upsertIssueTrackingSchema>
