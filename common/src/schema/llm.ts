// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { LlmType } from '@prisma/client'

export const upsertLlmSchema = z
  .object({
    name: z.string().trim().min(1),
    type: z.nativeEnum(LlmType),
    preferredModel: z.string().trim().min(1),
    apiKey: z.string().trim().min(1),
    tokenLimit: z.number().int().nonnegative().optional().default(0),
    isDefault: z.boolean().optional().default(false),
  })
  .partial({
    name: true,
    preferredModel: true,
    apiKey: true,
    tokenLimit: true,
    isDefault: true,
  })

export type UpsertLlmRequest = z.infer<typeof upsertLlmSchema>
