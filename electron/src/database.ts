// Copyright © 2026 Jalapeno Labs

// Core
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Misc
import { logFailed, logSuccess, logWarning } from './lib/logging'
import { DATABASE_URL } from './env'

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: DATABASE_URL,
  }),
})

export async function startDatabase(): Promise<boolean> {
  try {
    await prisma.$connect()
    // Test query to confirm connection is working
    await prisma.user.findFirst()
    logSuccess('Database connected')
    return true
  }
  catch (error) {
    logFailed('Database failed to connect')
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'ECONNREFUSED') {
        logFailed('Connection refused - is the database server running?')
        throw new Error('Database connection refused - is the database server running?')
      }
    }
    console.error(error)
    throw error
  }
}

export async function stopDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
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

export function requireDatabaseClient(context: string): PrismaClient {
  if (!prisma) {
    logWarning(`Database client requested before initialization: ${context}`)
    throw new Error(`Database client is not initialized: ${context}`)
  }

  return prisma
}
