// Copyright © 2026 Jalapeno Labs

import { getDatabaseClient } from '../database'
import { logFailed, logWarning } from './logging'

// Instantiates our application with a default mono user (will support multiple users in the future!)
export async function databaseMigrations() {
  const prismaClient = getDatabaseClient()
  if (!prismaClient) {
    logWarning('Skipping database migrations because the database client is not available')
    return
  }

  try {
    const user = await prismaClient.user.upsert({
      create: {
        username: 'default',
        name: 'default',
      },
      update: {},
      where: {
        username: 'default',
      },
    })

    await prismaClient.userSettings.upsert({
      create: {
        userId: user.id,
      },
      update: {},
      where: {
        userId: user.id,
      },
    })
  }
  catch (error) {
    logFailed('Database migrations failed')
    throw error
  }
}
