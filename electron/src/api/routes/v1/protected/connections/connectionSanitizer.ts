// Copyright © 2026 Jalapeno Labs

import type { Connection } from '@prisma/client'

function maskSecret(value?: string | null) {
  if (!value) {
    return value ?? null
  }

  if (value.length <= 8) {
    return value
  }

  return `${value.slice(0, 8)}${'*'.repeat(value.length - 8)}`
}

export function sanitizeConnection(connection: Connection) {
  return {
    ...connection,
    apiKey: maskSecret(connection.apiKey),
    accessToken: maskSecret(connection.accessToken),
    refreshToken: maskSecret(connection.refreshToken),
  } as const
}
