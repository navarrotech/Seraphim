// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'

export const envEntrySchema = z
  .object({
    key: z
      .string()
      .trim()
      .max(1028),
    value: z
      .string()
      .trim()
      .max(2048),
  })
export type EnvEntry = z.infer<typeof envEntrySchema>
