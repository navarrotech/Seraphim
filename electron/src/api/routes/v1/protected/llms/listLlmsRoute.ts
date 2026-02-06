// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { sanitizeLlm } from './llmSanitizer'

export async function handleListLlmsRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('List llms API')

  try {
    const llms = await databaseClient.llm.findMany({
      orderBy: { createdAt: 'desc' },
    })

    response.status(200).json({
      llms: llms.map(sanitizeLlm),
    })
  }
  catch (error) {
    console.error('Failed to list llms', error)
    response.status(500).json({ error: 'Failed to list llms' })
  }
}
