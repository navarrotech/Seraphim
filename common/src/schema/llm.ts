// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { LlmType } from '@prisma/client'

export const upsertLlmSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: z.nativeEnum(LlmType),
    preferredModel: z.string().trim().min(1).optional(),
    apiKey: z.string().trim().min(1).optional(),
    tokenLimit: z.number().int().nonnegative().optional().default(0),
    isDefault: z.boolean().optional().default(false),
  })

export type UpsertLlmRequest = z.infer<typeof upsertLlmSchema>
