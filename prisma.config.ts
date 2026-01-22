// Copyright © 2026 Jalapeno Labs

import 'dotenv/config'

// Lib
import { defineConfig } from 'prisma/config'

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL ?? ''
  if (!databaseUrl) {
    console.debug(
      'DATABASE_URL is not set. Prisma CLI commands that need a database connection may fail.',
    )
  }
  return databaseUrl
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: getDatabaseUrl(),
  },
})
