// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'

import { maskToken } from '@common/maskToken'

export function sanitizeLlm(llm: Llm) {
  return {
    ...llm,
    apiKey: maskToken(llm.apiKey, 8),
    accessToken: maskToken(llm.accessToken, 8),
    refreshToken: maskToken(llm.refreshToken, 8),
  } as const
}
