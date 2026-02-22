// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

// Core
import { useEffect } from 'react'
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
  const workspaces = useInitialData(
    'workspaces',
    listWorkspaces,
  )
  const tasks = useInitialData(
    'tasks',
    listTasks,
  )
  const accounts = useInitialData(
    'accounts',
    listAccounts,
  )
  const llms = useInitialData(
    'llms',
    listLlms,
  )
  const settings = useInitialData(
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

export function useInitialData<Shape>(
  cacheKey: string,
  fetcher: () => Promise<Shape>,
) {
  const query = useSWR(cacheKey, fetcher)

  useEffect(() => {
    if (!query.data) {
      return
    }

    if (query.error) {
      console.error(`Error fetching initial data for ${cacheKey}`, query.error)
    }
  }, [ query.data ])

  return {
    isLoading: query.isLoading,
    error: query.error,
  } as const
}
