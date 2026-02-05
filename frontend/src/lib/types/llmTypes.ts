// Copyright © 2026 Jalapeno Labs

import type { Llm as PrismaLlm } from '@prisma/client'

export type LlmRecord = PrismaLlm & {
  preferredModel?: string | null
}
