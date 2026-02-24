// Copyright © 2026 Jalapeno Labs

// Core
import { config as dotenvConfig } from 'dotenv'

// Misc
import { searchFileListForExisting } from '@common/node/searchFileListForExisting'

const loadedPath = searchFileListForExisting([
  [ process.cwd(), '.env' ],
  [ process.cwd(), '..', '.env' ],
])

if (!loadedPath) {
  throw new Error('No .env file found for electron process')
}

dotenvConfig({
  path: loadedPath,
})

function expandEnvTemplate(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, function replaceTemplate(_match, variableName: string) {
    const variableValue = process.env[variableName]
    if (!variableValue) {
      console.debug('Env template variable missing', { variableName })
      return ''
    }
    return variableValue
  })
}

function buildDatabaseUrlFromParts(): string {
  const user = process.env.POSTGRES_USER ?? ''
  const password = process.env.POSTGRES_PASSWORD ?? ''
  const database = process.env.POSTGRES_DB ?? ''
  const host = process.env.POSTGRES_HOST ?? 'localhost'
  const port = '9902'

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

function resolveDatabaseUrl(): string {
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
    console.debug('DATABASE_URL could not be composed from POSTGRES_* values')
  }
  return composedDatabaseUrl
}

function isDev() {
  if (!process.mainModule) {
    return true
  }
  return process.mainModule?.filename.indexOf('app.asar') === -1
}

export const isProduction = !isDev()

export const DATABASE_URL = resolveDatabaseUrl()

if (!DATABASE_URL) {
  throw Error('Database failed to start due to invalid DATABASE_URL')
}

export const DOCKER_SOCK_PATH = process.env.DOCKER_SOCK_PATH
