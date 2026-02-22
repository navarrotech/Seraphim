// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { LlmWithRateLimits } from '@common/types'

// Misc
import { getCallableLLM } from '@common/llms/call'
import { requireDatabaseClient } from '@electron/database'
import { sanitizeLlm } from './utils'

export async function handleListLlmsRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('List llms API')

  try {
    const llms = await databaseClient.llm.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const llmsWithRateLimits: LlmWithRateLimits[] = await Promise.all(
      llms.map(async (llm) => {
        const callableLlm = getCallableLLM(llm)
        const rateLimits = await callableLlm.getRateLimits()

        return {
          ...sanitizeLlm(llm),
          rateLimits,
        }
      }),
    )

    response.status(200).json({
      llms: llmsWithRateLimits,
    })
  }
  catch (error) {
    console.error('Failed to list llms', error)
    response.status(500).json({ error: 'Failed to list llms' })
  }
}
