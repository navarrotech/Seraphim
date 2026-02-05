// Copyright © 2026 Jalapeno Labs

import type { Llm, Prisma } from '@prisma/client'
import type { Request, Response } from 'express'
import type { LlmUpdateRequest } from '@common/schema'

// Lib
import { z } from 'zod'

// Utility
import { parseRequestBody, parseRequestParams } from '../../validation'
import { llmUpdateSchema } from '@common/schema'

// Misc
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { requireDatabaseClient } from '@electron/database'
import { sanitizeLlm } from './llmSanitizer'

type RouteParams = {
  llmId: string
}

type DatabaseClient = ReturnType<typeof requireDatabaseClient>

export type RequestBody = LlmUpdateRequest

const apiKeyLlmTypes = new Set<Llm['type']>([
  'OPENAI_API_KEY',
  'KIMI_API_KEY',
])

const llmParamsSchema = z.object({
  llmId: z.string().trim().min(1),
})

async function updateLlmWithDefaults(
  databaseClient: DatabaseClient,
  llmId: string,
  userId: string,
  updateData: RequestBody,
) {
  async function updateLlmTransaction(
    transactionClient: Prisma.TransactionClient,
  ) {
    if (updateData.isDefault === true) {
      await transactionClient.llm.updateMany({
        where: {
          userId,
          id: { not: llmId },
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    return transactionClient.llm.update({
      where: { id: llmId },
      data: updateData,
    })
  }

  return databaseClient.$transaction(updateLlmTransaction)
}

export async function handleUpdateLlmRequest(
  request: Request<RouteParams, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Update llm API')

  const routeParams = parseRequestParams(
    llmParamsSchema,
    request,
    response,
    {
      context: 'Update llm API',
      errorMessage: 'Llm ID is required',
    },
  )
  if (!routeParams) {
    return
  }

  const updateData = parseRequestBody(
    llmUpdateSchema,
    request,
    response,
    {
      context: 'Update llm API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!updateData) {
    return
  }

  const { llmId } = routeParams

  try {
    const existingLlm = await databaseClient.llm.findUnique({
      where: { id: llmId },
    })

    if (!existingLlm) {
      console.debug('Llm update failed, llm not found', {
        llmId,
      })
      response.status(404).json({ error: 'Llm not found' })
      return
    }

    if (
      updateData.apiKey
      && !apiKeyLlmTypes.has(existingLlm.type)
    ) {
      console.debug('Llm update rejected for unsupported apiKey change', {
        llmId,
        type: existingLlm.type,
      })
      response.status(400).json({
        error: 'API key updates are not supported for this llm type',
      })
      return
    }

    const llm = await updateLlmWithDefaults(
      databaseClient,
      llmId,
      existingLlm.userId,
      updateData,
    )

    const sanitizedLlm = sanitizeLlm(llm)

    broadcastSseChange({
      type: 'update',
      kind: 'llms',
      data: [ sanitizedLlm ],
    })

    response.status(200).json({ llm: sanitizedLlm })
  }
  catch (error) {
    console.error('Failed to update llm', error)
    response.status(500).json({ error: 'Failed to update llm' })
  }
}
