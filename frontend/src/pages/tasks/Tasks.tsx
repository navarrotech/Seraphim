// Copyright © 2026 Jalapeno Labs

// Core
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Lib
import useSWR from 'swr'

// Redux
import { dispatch, useSelector } from '@frontend/framework/store'
import { taskActions } from '@frontend/framework/redux/stores/tasks'

// User interface
import { Card } from '@heroui/react'
import { EmptyTaskView } from './EmptyTaskView'
import { TaskView } from './TaskView'
import { TasksSidebar } from './TasksSidebar'

// Misc
import { createTask, getTask } from '@frontend/lib/routes/taskRoutes'
import { getCurrentUser } from '@frontend/lib/routes/userRoutes'
import { getTaskViewUrl } from '@common/urls'

const DEFAULT_TASK_BRANCH = 'main'
const DEFAULT_TASK_CONTAINER = 'node:latest'

type TaskRouteParams = {
  taskId?: string
}

type TaskDraft = {
  message: string
  workspaceId: string
  connectionId: string
}

function buildTaskName(message: string) {
  const trimmedMessage = message.trim()

  if (!trimmedMessage) {
    return 'New Task'
  }

  const firstLine = trimmedMessage.split('\n')[0]
  if (firstLine.length <= 64) {
    return firstLine
  }

  return `${firstLine.slice(0, 64)}...`
}

export function Tasks() {
  const { taskId } = useParams<TaskRouteParams>()
  const navigate = useNavigate()

  const tasks = useSelector((state) => state.tasks.items)
  const workspaces = useSelector((state) => state.workspaces.items)
  const connections = useSelector((state) => state.connections.items)

  const selectedTask = taskId
    ? tasks.find((task) => task.id === taskId)
    : undefined

  const resolvedTaskId = taskId || ''
  const taskQuery = useSWR(
    taskId ? [ 'task', taskId ] : null,
    () => getTask(resolvedTaskId),
  )
  const currentUserQuery = useSWR('current-user', getCurrentUser)

  const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false)

  async function handleCreateTask(draft: TaskDraft) {
    const user = currentUserQuery.data?.user
    if (!user) {
      console.debug('Tasks cannot create a task without a user', { draft })
      return
    }

    const workspace = workspaces.find((entry) => entry.id === draft.workspaceId)
    if (!workspace) {
      console.debug('Tasks cannot create a task without a workspace', { draft })
      return
    }

    const connection = connections.find((entry) => entry.id === draft.connectionId)
    if (!connection) {
      console.debug('Tasks cannot create a task without a connection', { draft })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await createTask({
        userId: user.id,
        workspaceId: workspace.id,
        connectionId: draft.connectionId,
        name: buildTaskName(draft.message),
        branch: DEFAULT_TASK_BRANCH,
        container: workspace.containerImage || DEFAULT_TASK_CONTAINER,
        archived: false,
      })

      dispatch(
        taskActions.upsertTasks([ response.task ]),
      )

      navigate(
        getTaskViewUrl(response.task.id),
      )
    }
    catch (error) {
      console.debug('Tasks failed to create task', { error })
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const isTaskLoading = Boolean(taskId && !taskQuery.data && !taskQuery.error)
  const taskMessages = taskQuery.data?.task.messages || []
  const hasMessages = taskMessages.length > 0
  const shouldShowEmpty = !taskId || !hasMessages
  const taskName = taskQuery.data?.task.name || selectedTask?.name || 'Untitled task'
  const emptyWorkspaceId = taskQuery.data?.task.workspaceId || selectedTask?.workspaceId

  return <section className={`flex flex-1 min-h-0 flex-col bg-gradient-to-br
  from-slate-50 via-sky-50 to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800`}>
    <div className='flex min-h-0 flex-1 overflow-hidden'>
      <TasksSidebar
        tasks={tasks}
        workspaces={workspaces}
        selectedTaskId={taskId}
      />
      <main className='min-h-0 flex-1 overflow-y-auto p-6'>
        {isTaskLoading && (
          <Card className='p-6'>
            <p className='opacity-80'>Loading task details...</p>
          </Card>
        )}
        {!isTaskLoading && taskQuery.error && (
          <Card className='p-6'>
            <p className='opacity-80'>Unable to load this task.</p>
          </Card>
        )}
        {!isTaskLoading && !taskQuery.error && shouldShowEmpty && (
          <EmptyTaskView
            workspaces={workspaces}
            defaultWorkspaceId={emptyWorkspaceId}
            isSubmitting={isSubmitting}
            onSubmit={handleCreateTask}
          />
        )}
        {!isTaskLoading && !taskQuery.error && !shouldShowEmpty && (
          <TaskView
            messages={taskMessages}
            taskName={taskName}
          />
        )}
      </main>
    </div>
  </section>
}
