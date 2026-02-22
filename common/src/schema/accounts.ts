// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { AuthProvider } from '@prisma/client'

export const addAccountSchema = z
  .object({
    name: z.string().trim().min(1),
    provider: z.nativeEnum(AuthProvider),
    accessToken: z.string().trim().min(1),
    gitUserName: z.string().trim().min(1),
    gitUserEmail: z.string().trim().email(),
  })
export type AddAccountRequest = z.infer<typeof addAccountSchema>

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    accessToken: z.string().trim().min(1).optional(),
    gitUserName: z.string().trim().min(1).optional(),
    gitUserEmail: z.string().trim().email().optional(),
  })
  .refine(
    (payload) => Boolean(payload.name || payload.accessToken || payload.gitUserName || payload.gitUserEmail),
    { message: 'At least one editable account field is required' },
  )
export type UpdateAccountRequest = z.infer<typeof updateAccountSchema>
