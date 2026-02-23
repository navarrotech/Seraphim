// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

// Core
import useSWR from 'swr'

// UI
import { Card } from '@heroui/react'

// Misc
import { listAccounts } from '@frontend/routes/accountsRoutes'
import { listLlms } from '@frontend/routes/llmRoutes'
import { listTasks } from '@frontend/routes/taskRoutes'
import { listWorkspaces } from '@frontend/routes/workspaceRoutes'
import { getCurrentUser } from '@frontend/routes/userRoutes'

type Props = {
  children: ReactNode
}

export function InitialDataGate(props: Props) {
  const workspaces = useSWR(
    'workspaces',
    listWorkspaces,
  )
  const tasks = useSWR(
    'tasks',
    listTasks,
  )
  const accounts = useSWR(
    'accounts',
    listAccounts,
  )
  const llms = useSWR(
    'llms',
    listLlms,
  )
  const settings = useSWR(
    'current-user',
    getCurrentUser,
  )

  const isLoading = Boolean(
    workspaces.isLoading
    || tasks.isLoading
    || accounts.isLoading
    || llms.isLoading
    || settings.isLoading,
  )

  if (isLoading) {
    return <main className='container p-8'>
      <Card className='p-6'>
        <p className='opacity-80'>Loading workspace data...</p>
      </Card>
    </main>
  }

  const hasError = Boolean(
    workspaces.error
    || tasks.error
    || accounts.error
    || llms.error
    || settings.error,
  )

  if (hasError) {
    return <main className='container p-8'>
      <Card className='p-6'>
        <p className='opacity-80'>Unable to load workspace data.</p>
      </Card>
    </main>
  }

  return props.children
}
