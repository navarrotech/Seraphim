// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { useLocation } from 'react-router-dom'

// Lib
import useSWR from 'swr'

// User interface
import { Card } from '@heroui/react'

// Utility
import { dispatch } from '@frontend/framework/store'
import { taskActions } from '@frontend/framework/redux/stores/tasks'
import { workspaceActions } from '@frontend/framework/redux/stores/workspaces'

// Misc
import { listTasks } from '@frontend/lib/routes/taskRoutes'
import { listWorkspaces } from '@frontend/lib/routes/workspaceRoutes'
import { GettingStarted } from '../GettingStarted'
import { UrlTree } from '@common/urls'

export function DashboardGate() {
  const workspacesQuery = useSWR('workspaces', listWorkspaces)
  const tasksQuery = useSWR('tasks', listTasks)
  const location = useLocation()

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

  const isLoading = workspacesQuery.isLoading || tasksQuery.isLoading
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

  if (workspacesQuery.error || tasksQuery.error) {
    return <main className='container p-8'>
      <Card className='p-6'>
        <p className='opacity-80'>Unable to load workspace data.</p>
      </Card>
    </main>
  }

  if (hasEmptyData && location.pathname !== UrlTree.workspaceCreate) {
    return <GettingStarted />
  }

  return <main>
    <Outlet />
  </main>
}
