// Copyright © 2026 Jalapeno Labs

// Lib
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

config()

function expandEnvTemplate(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, function replaceTemplate(_match, variableName: string) {
    return process.env[variableName] ?? ''
  })
}

function buildDatabaseUrlFromParts(): string {
  const user = process.env.POSTGRES_USER ?? ''
  const password = process.env.POSTGRES_PASSWORD ?? ''
  const database = process.env.POSTGRES_DB ?? ''
  const host = process.env.POSTGRES_HOST ?? 'localhost'
  const port = process.env.POSTGRES_PORT ?? '992'

  if (!user || !password || !database) {
    console.debug('Database credentials missing for DATABASE_URL composition', {
      hasUser: Boolean(user),
      hasPassword: Boolean(password),
      hasDatabase: Boolean(database),
    })
    return ''
  }

  return `postgresql://${user}:${password}@${host}:${port}/${database}`
}

function getDatabaseUrl(): string {
  const rawDatabaseUrl = process.env.DATABASE_URL ?? ''
  if (rawDatabaseUrl) {
    const expandedDatabaseUrl = expandEnvTemplate(rawDatabaseUrl)
    if (expandedDatabaseUrl.includes('${')) {
      console.debug('DATABASE_URL contains unresolved template variables', { rawDatabaseUrl })
      return ''
    }
    return expandedDatabaseUrl
  }

  const composedDatabaseUrl = buildDatabaseUrlFromParts()
  if (!composedDatabaseUrl) {
    console.debug(
      'DATABASE_URL is not set. Prisma CLI commands that need a database connection may fail.',
    )
  }
  return composedDatabaseUrl
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: getDatabaseUrl(),
  },
})
