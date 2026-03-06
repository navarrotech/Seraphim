// Copyright © 2026 Jalapeno Labs

// Core
import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'

// Redux
import { useSelector } from '@frontend/framework/store'

// Misc
import { UrlTree } from '@common/urls'
import { EditTask } from './components/EditTask'

export function ViewTaskPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const tasks = useSelector((state) => state.tasks.items)
  const task = useMemo(() => tasks.find((item) => item.id === taskId), [ tasks, taskId ])

  if (!taskId || !task) {
    console.debug('ViewTaskPage task not found in redux, redirecting to tasks list', { taskId })
    return <Navigate to={UrlTree.tasks} replace />
  }

  return <EditTask
    task={task as any}
  />
}
