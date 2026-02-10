// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'

import { maskToken } from '@common/maskToken'

export function sanitizeLlm(llm: Llm) {
  return {
    ...llm,
    apiKey: maskToken(llm.apiKey),
    accessToken: maskToken(llm.accessToken),
    refreshToken: maskToken(llm.refreshToken),
  } as const
}
