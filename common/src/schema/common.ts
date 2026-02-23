// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'

export const environmentEntrySchema = z
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
export type Environment = z.infer<typeof environmentEntrySchema>
