// Copyright © 2026 Jalapeno Labs

// Core
import { PrismaClient } from '@prisma/client'

// Misc
import { DATABASE_URL } from './env'
import { logFailed, logSuccess, logWarning } from './lib/logging'

let databaseClient: PrismaClient | null = null

export async function startDatabase(): Promise<boolean> {
  if (databaseClient) {
    logWarning('Database already started, skipping new connection')
    return true
  }

  const databaseUrl = DATABASE_URL
  if (!databaseUrl) {
    logFailed('Database failed to start because DATABASE_URL is not set')
    return null
  }

  databaseClient = new PrismaClient()

  try {
    await databaseClient.$connect()
    logSuccess('Database connected')
    return true
  }
  catch (error) {
    logFailed('Database failed to connect')
    console.error(error)
    databaseClient = null
    return false
  }
}

export async function stopDatabase(): Promise<void> {
  if (!databaseClient) {
    logWarning('Database stop requested, but no connection is running')
    return
  }

  const prismaClient = databaseClient
  databaseClient = null

  try {
    await prismaClient.$disconnect()
    logSuccess('Database disconnected')
  }
  catch (error) {
    logFailed('Database failed to disconnect cleanly')
    console.error(error)
  }
}
