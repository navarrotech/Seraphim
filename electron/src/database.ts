// Copyright © 2026 Jalapeno Labs

// Core
import { PrismaClient } from '@prisma/client'

// Misc
import { DATABASE_URL } from './env'
import { logFailed, logSuccess, logWarning } from './lib/logging'

let prisma: PrismaClient | null = null

export async function startDatabase(): Promise<boolean> {
  if (prisma) {
    logWarning('Database already started, skipping new connection')
    return true
  }

  const databaseUrl = DATABASE_URL
  if (!databaseUrl) {
    logFailed('Database failed to start because DATABASE_URL is not set')
    return null
  }

  prisma = new PrismaClient()

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
