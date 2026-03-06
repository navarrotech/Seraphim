// Copyright © 2026 Jalapeno Labs

import type { Task } from '@common/types'

// Core
import { Navigate, useNavigate } from 'react-router'

// Redux
import { useSelector } from '@frontend/framework/store'

// User Interface
import { TaskItemsList } from './TaskItemsList'

// Misc
import { UrlTree } from '@common/urls'

function getTaskViewUrl(taskId: string) {
  return UrlTree.viewTask.replace(':taskId', taskId)
}

export function ListTasksPage() {
  const navigate = useNavigate()
  const tasks = useSelector((state) => state.tasks.items)

  if (!tasks?.length) {
    console.debug('ListTasksPage has no tasks in redux, redirecting to new task page')
    return <Navigate to={UrlTree.newTasks} replace />
  }

  function handleSelectTask(task: Task) {
    navigate(
      getTaskViewUrl(task.id),
    )
  }

  return <article className='relaxed'>
    <header className='compact level'>
      <div className='level-left'>
        <h1 className='text-2xl font-bold'>Tasks</h1>
      </div>
    </header>
    <TaskItemsList
      tasks={tasks}
      onSelectTask={handleSelectTask}
    />
  </article>
}
