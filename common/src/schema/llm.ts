// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'
import { LlmType } from '@prisma/client'

export const createLlmSchema = z
  .object({
    name: z.string().trim().min(1),
    type: z.nativeEnum(LlmType),
    preferredModel: z.string().trim().min(1),
    apiKey: z.string().trim().min(1),
    tokenLimit: z.number().int().nonnegative().optional().default(0),
    isDefault: z.boolean().optional().default(false),
  })
  .strict()
export type CreateLlmRequest = z.infer<typeof createLlmSchema>

export const updateLlmSchema = createLlmSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No valid fields provided for update',
  })
export type UpdateLlmRequest = z.infer<typeof updateLlmSchema>
