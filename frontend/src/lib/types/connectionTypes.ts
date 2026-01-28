// Copyright © 2026 Jalapeno Labs

import type { Connection as PrismaConnection } from '@prisma/client'

export type ConnectionRecord = PrismaConnection & {
  preferredModel?: string | null
}
