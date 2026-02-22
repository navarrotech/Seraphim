// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'

// Core
import { useEffect } from 'react'
import useSWR from 'swr'

// Redux
import { dispatch } from '@frontend/framework/store'
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { llmActions } from '@frontend/framework/redux/stores/llms'
import { settingsActions } from '@frontend/framework/redux/stores/settings'
import { taskActions } from '@frontend/framework/redux/stores/tasks'
import { workspaceActions } from '@frontend/framework/redux/stores/workspaces'

// UI
import { Card } from '@heroui/react'

// Misc
import { listAccounts } from '@frontend/lib/routes/accountsRoutes'
import { listLlms } from '@frontend/lib/routes/llmRoutes'
import { listTasks } from '@frontend/lib/routes/taskRoutes'
import { listWorkspaces } from '@frontend/lib/routes/workspaceRoutes'
import { getCurrentUser } from '@frontend/lib/routes/userRoutes'

type Props = {
  children: ReactNode
}

export function InitialDataGate(props: Props) {
  const workspaces = useInitialData(
    'workspaces',
    listWorkspaces,
    (dispatch, data) => dispatch(
      workspaceActions.setWorkspaces(data.workspaces),
    ),
  )
  const tasks = useInitialData(
    'tasks',
    listTasks,
    (dispatch, data) => dispatch(
      taskActions.setTasks(data.tasks),
    ),
  )
  const accounts = useInitialData(
    'accounts',
    listAccounts,
    (dispatch, data) => dispatch(
      accountActions.setAccounts(data.accounts),
    ),
  )
  const llms = useInitialData(
    'llms',
    listLlms,
    (dispatch, data) => dispatch(
      llmActions.setLlms(data.llms),
    ),
  )
  const settings = useInitialData(
    'current-user',
    getCurrentUser,
    (dispatch, data) => dispatch(
      settingsActions.setSettings(data.user.settings ?? null),
    ),
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
  dispatchAction: (reduxDispatch: typeof dispatch, data: Shape) => void,
) {
  const query = useSWR(cacheKey, fetcher)

  useEffect(() => {
    if (!query.data) {
      return
    }

    if (query.error) {
      console.error(`Error fetching initial data for ${cacheKey}`, query.error)
      return
    }

    dispatchAction(dispatch, query.data)
  }, [ query.data ])

  return {
    isLoading: query.isLoading,
    error: query.error,
  } as const
}
