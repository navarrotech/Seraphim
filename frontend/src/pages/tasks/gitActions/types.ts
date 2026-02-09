// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'

export type TaskGitActionContext = {
  task: Task
  provider: string
}
