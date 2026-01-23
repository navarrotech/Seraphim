// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'

export const environmentSchema = z.object({
  key: z
    .string()
    .max(256),
  value: z
    .string()
    .max(2048),
})

export type Environment = z.infer<typeof environmentSchema>
