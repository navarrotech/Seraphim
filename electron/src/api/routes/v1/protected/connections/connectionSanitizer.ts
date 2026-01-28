// Copyright © 2026 Jalapeno Labs

import type { Connection } from '@prisma/client'

import { maskToken } from '@common/maskToken'

export function sanitizeConnection(connection: Connection) {
  return {
    ...connection,
    apiKey: maskToken(connection.apiKey, 8),
    accessToken: maskToken(connection.accessToken, 8),
    refreshToken: maskToken(connection.refreshToken, 8),
  } as const
}
