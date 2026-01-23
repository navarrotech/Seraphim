// Copyright © 2026 Jalapeno Labs

// Core
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Misc
import { logFailed, logSuccess, logWarning } from './lib/logging'
import { DATABASE_URL } from './env'

let prisma: PrismaClient | null = null

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
})

export async function startDatabase(): Promise<boolean> {
  if (prisma) {
    logWarning('Database already started, skipping new connection')
    return true
  }

  prisma = new PrismaClient({
    adapter,
  })

  try {
    await prisma.$connect()
    logSuccess('Database connected')
    return true
  }
  catch (error) {
    logFailed('Database failed to connect')
    console.error(error)
    prisma = null
    return false
  }
}

export async function stopDatabase(): Promise<void> {
  if (!prisma) {
    logWarning('Database stop requested, but no connection is running')
    return
  }

  const prismaClient = prisma
  prisma = null

  try {
    await prismaClient.$disconnect()
    logSuccess('Database disconnected')
  }
  catch (error) {
    logFailed('Database failed to disconnect cleanly')
    console.error(error)
  }
}

export function getDatabaseClient(): PrismaClient | null {
  if (!prisma) {
    logWarning('Database client requested before initialization')
    return null
  }

  return prisma
}
