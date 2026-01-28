// Copyright © 2026 Jalapeno Labs

import type { Prisma, PrismaClient } from '@prisma/client'

type CreateConnectionOptions = {
  userId: string
  data: Prisma.ConnectionCreateInput
  isDefault?: boolean
}

export async function createConnectionWithDefaults(
  databaseClient: PrismaClient,
  options: CreateConnectionOptions,
) {
  async function createConnectionTransaction(
    transactionClient: Prisma.TransactionClient,
  ) {
    if (options.isDefault) {
      await transactionClient.connection.updateMany({
        where: {
          userId: options.userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    return transactionClient.connection.create({
      data: options.data,
    })
  }

  return databaseClient.$transaction(createConnectionTransaction)
}
