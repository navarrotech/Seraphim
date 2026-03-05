// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { IssueTrackingProvider } from '@prisma/client'

export const upsertIssueTrackingSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    provider: z.nativeEnum(IssueTrackingProvider),
    baseUrl: z.string().trim().url().optional(),
    email: z.string().trim().email().optional(),
    accessToken: z.string().trim().optional(),
    targetBoard: z.string().trim().min(1).optional(),
  })

export type UpsertIssueTrackingRequest = z.infer<typeof upsertIssueTrackingSchema>

export const listIssueTrackingIssuesParamsSchema = z.object({
  issueTrackingId: z.string().trim().uuid(),
})
export type ListIssueTrackingIssuesParams = z.infer<typeof listIssueTrackingIssuesParamsSchema>

export const listIssueTrackingIssuesQuerySchema = z.object({
  q: z.string().trim().optional(),
  mode: z.enum([ 'text', 'jql' ]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
export type ListIssueTrackingIssuesQuery = z.infer<typeof listIssueTrackingIssuesQuerySchema>

export const listIssueTrackingIssuesRequestSchema = z.object({
  issueTrackingId: z.string().trim().uuid(),
  q: z.string().trim().optional(),
  mode: z.enum([ 'text', 'jql' ]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
export type ListIssueTrackingIssuesRequest = z.infer<typeof listIssueTrackingIssuesRequestSchema>
