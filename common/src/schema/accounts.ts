// Copyright © 2026 Jalapeno Labs

// Lib
import { AuthProvider } from '@prisma/client'
import { z } from 'zod'

export const upsertAccountSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    provider: z.nativeEnum(AuthProvider).optional(),
    accessToken: z.string().trim().optional(),
    gitUserName: z.string().trim().min(1).optional(),
    gitUserEmail: z.string().trim().email().optional(),
  })

export type UpsertAccountRequest = z.infer<typeof upsertAccountSchema>
