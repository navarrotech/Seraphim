// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { useLocation } from 'react-router-dom'

// Lib
import useSWR from 'swr'

// Redux
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { llmActions } from '@frontend/framework/redux/stores/llms'
import { settingsActions } from '@frontend/framework/redux/stores/settings'
import { taskActions } from '@frontend/framework/redux/stores/tasks'
import { workspaceActions } from '@frontend/framework/redux/stores/workspaces'
import { dispatch } from '@frontend/framework/store'

// User interface
import { Card } from '@heroui/react'
import { AppTopbar } from '../AppTopbar'

// Utility
import { useApiSocket } from '@frontend/hooks/useApiSocket'

// Misc
import { listAccounts } from '@frontend/lib/routes/accountsRoutes'
import { listLlms } from '@frontend/lib/routes/llmRoutes'
import { listTasks } from '@frontend/lib/routes/taskRoutes'
import { listWorkspaces } from '@frontend/lib/routes/workspaceRoutes'
import { getCurrentUser } from '@frontend/lib/routes/userRoutes'
import { GettingStarted } from '../GettingStarted'
import { UrlTree } from '@common/urls'

export function DashboardGate() {
  const workspacesQuery = useSWR('workspaces', listWorkspaces)
  const tasksQuery = useSWR('tasks', listTasks)
  const accountsQuery = useSWR('accounts', listAccounts)
  const llmsQuery = useSWR('llms', listLlms)
  const settingsQuery = useSWR('current-user', getCurrentUser)
  const location = useLocation()

  useApiSocket()

  useEffect(function syncWorkspaces() {
    if (!workspacesQuery.data?.workspaces) {
      return
    }

    dispatch(
      workspaceActions.setWorkspaces(workspacesQuery.data.workspaces),
    )
  }, [ workspacesQuery.data ])

  useEffect(function syncTasks() {
    if (!tasksQuery.data?.tasks) {
      return
    }

    dispatch(
      taskActions.setTasks(tasksQuery.data.tasks),
    )
  }, [ tasksQuery.data ])

  useEffect(function syncAccounts() {
    if (!accountsQuery.data?.accounts) {
      return
    }

    dispatch(
      accountActions.setAccounts(accountsQuery.data.accounts),
    )
  }, [ accountsQuery.data ])

  useEffect(function syncLlms() {
    if (!llmsQuery.data?.llms) {
      return
    }

    dispatch(
      llmActions.setLlms(llmsQuery.data.llms),
    )
  }, [ llmsQuery.data ])

  useEffect(function syncSettings() {
    if (!settingsQuery.data?.user) {
      return
    }

    dispatch(
      settingsActions.setSettings(settingsQuery.data.user.settings ?? null),
    )
  }, [ settingsQuery.data ])

  const isLoading = Boolean(
    workspacesQuery.isLoading
    || tasksQuery.isLoading
    || accountsQuery.isLoading
    || llmsQuery.isLoading
    || settingsQuery.isLoading,
  )
  const hasEmptyData = Boolean(
    !isLoading
    && workspacesQuery.data?.workspaces?.length === 0
    && tasksQuery.data?.tasks?.length === 0,
  )

  if (isLoading) {
    return <main className='container p-8'>
      <Card className='p-6'>
        <p className='opacity-80'>Loading workspace data...</p>
      </Card>
    </main>
  }

  if (
    workspacesQuery.error
    || tasksQuery.error
    || accountsQuery.error
    || llmsQuery.error
    || settingsQuery.error
  ) {
    return <main className='container p-8'>
      <Card className='p-6'>
        <p className='opacity-80'>Unable to load workspace data.</p>
      </Card>
    </main>
  }

  if (hasEmptyData && location.pathname !== UrlTree.workspaceCreate) {
    return <GettingStarted />
  }

  return <main className='flex min-h-screen flex-col overflow-hidden'>
    <AppTopbar />
    <div className='flex flex-1 min-h-0 overflow-hidden'>
      <Outlet />
    </div>
  </main>
}
