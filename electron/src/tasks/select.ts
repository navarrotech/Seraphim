// Copyright © 2026 Jalapeno Labs

import type { Prisma } from '@prisma/client'

export const selectTaskWithFullContext = {
  llm: true,
  authAccount: true,
  turns: {
    include: {
      messages: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  user: true,
  workspace: {
    include: {
      envEntries: true,
    },
  },
} as const satisfies Prisma.TaskSelect
