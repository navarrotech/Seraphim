// Copyright © 2026 Jalapeno Labs

import type { Prisma, PrismaClient } from '@prisma/client'

type CreateLlmOptions = {
  userId: string
  data: Prisma.LlmCreateInput
  isDefault?: boolean
}

export async function createLlmWithDefaults(
  databaseClient: PrismaClient,
  options: CreateLlmOptions,
) {
  async function createLlmTransaction(
    transactionClient: Prisma.TransactionClient,
  ) {
    if (options.isDefault) {
      await transactionClient.llm.updateMany({
        where: {
          userId: options.userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    return transactionClient.llm.create({
      data: options.data,
    })
  }

  return databaseClient.$transaction(createLlmTransaction)
}
