// Copyright © 2026 Jalapeno Labs

import type { Llm, LlmWithRateLimits } from '@common/types'

// Core
import { requireDatabaseClient } from '@electron/database'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { getCallableLLM } from '@common/llms/call'
import { maskToken } from '@common/maskToken'

export async function setNewDefaultLlm(userId: string, newDefaultLlmId: string): Promise<void> {
  const prisma = requireDatabaseClient('Set new default LLM')

  const existingDefault = await prisma.llm.findFirst({
    where: {
      userId: userId,
      isDefault: true,
      id: {
        not: newDefaultLlmId,
      },
    },
  })

  if (existingDefault) {
    if (existingDefault.id === newDefaultLlmId) {
      console.debug('New default LLM is the same as the existing default LLM, skipping default tag update')
      return
    }

    const callableLlm = getCallableLLM(existingDefault)
    const rateLimits = await callableLlm.getRateLimits()

    const withRateLimits: LlmWithRateLimits = {
      ...sanitizeLlm(existingDefault),
      rateLimits,
    }

    broadcastSseChange({
      type: 'update',
      kind: 'llms',
      data: withRateLimits,
    })

    await prisma.llm.updateMany({
      where: {
        userId: userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    })

    await prisma.llm.update({
      where: {
        id: newDefaultLlmId,
      },
      data: {
        isDefault: true,
      },
    })
  }
}

export function sanitizeLlm(llm: Llm) {
  return {
    ...llm,
    apiKey: maskToken(llm.apiKey),
    refreshToken: maskToken(llm.refreshToken),
  } as const
}
