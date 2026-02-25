// Copyright © 2026 Jalapeno Labs

// Lib
import { AuthProvider } from '@prisma/client'
import { z } from 'zod'

export const upsertAccountSchema = z
  .object({
    name: z.string().trim().min(1),
    provider: z.nativeEnum(AuthProvider),
    accessToken: z.string().trim().optional(),
    gitUserName: z.string().trim().min(1),
    gitUserEmail: z.string().trim().email(),
  })
  .partial()
  .refine(
    (payload) => Boolean(
      payload.name
      || payload.accessToken
      || payload.gitUserName
      || payload.gitUserEmail,
    ),
    { message: 'At least one editable account field is required' },
  )

export type UpsertAccountRequest = z.infer<typeof upsertAccountSchema>
