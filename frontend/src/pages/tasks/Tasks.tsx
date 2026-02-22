// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Lib
import useSWR from 'swr'

// Redux
import { dispatch, useSelector } from '@frontend/framework/store'
import { llmActions } from '@frontend/framework/redux/stores/llms'
import { taskActions } from '@frontend/framework/redux/stores/tasks'

// User interface
import { Card } from '@heroui/react'
import { EmptyTaskView } from './EmptyTaskView'
import { TaskView } from './TaskView'

// Misc
import { createTask, getTask, getTaskUsage } from '@frontend/lib/routes/taskRoutes'
import { getLlmRateLimits } from '@frontend/lib/routes/llmRoutes'
import { getCurrentUser } from '@frontend/lib/routes/userRoutes'
import { getTaskViewUrl } from '@common/urls'

type TaskRouteParams = {
  taskId?: string
}

type TaskDraft = {
  message: string
  workspaceId: string
  authAccountId: string
  llmId: string
  branch: string
  issueLink: string
}

export function Tasks() {
  const { taskId } = useParams<TaskRouteParams>()
  const navigate = useNavigate()

  const tasks = useSelector((state) => state.tasks.items)
  const workspaces = useSelector((state) => state.workspaces.items)
  const llms = useSelector((state) => state.llms.items)
  const authAccounts = useSelector((state) => state.accounts.items)

  const selectedTask = taskId
    ? tasks.find((task) => task.id === taskId)
    : undefined

  const resolvedTaskId = taskId || ''
  const taskQuery = useSWR(
    taskId ? [ 'task', taskId ] : null,
    () => getTask(resolvedTaskId),
  )
  const currentUserQuery = useSWR('current-user', getCurrentUser)
  const taskUsageQuery = useSWR(
    taskId ? [ 'task-usage', taskId ] : null,
    () => getTaskUsage(resolvedTaskId),
  )

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

    const llm = llms.find((entry) => entry.id === draft.llmId)
    if (!llm) {
      console.debug('Tasks cannot create a task without a llm', { draft })
      return
    }

    const authAccount = authAccounts.find((entry) => entry.id === draft.authAccountId)
    if (!authAccount) {
      console.debug('Tasks cannot create a task without an auth account', { draft })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await createTask({
        userId: user.id,
        workspaceId: workspace.id,
        authAccountId: authAccount.id,
        llmId: draft.llmId,
        message: draft.message,
        branch: draft.branch,
        issueLink: draft.issueLink || undefined,
        archived: false,
      })

      dispatch(
        taskActions.upsertTask(response.task),
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
  const resolvedTask = taskQuery.data?.task || selectedTask
  const resolvedLlmId = resolvedTask?.llmId
  const llmRateLimitsQuery = useSWR(
    resolvedLlmId ? [ 'llm-rate-limits', resolvedLlmId ] : null,
    () => getLlmRateLimits(resolvedLlmId || ''),
  )
  const shouldShowEmpty = !taskId
  const taskName = taskQuery.data?.task.name || selectedTask?.name || 'Untitled task'
  const taskContainerName = taskQuery.data?.task.containerName || selectedTask?.containerName
  const emptyWorkspaceId = taskQuery.data?.task.workspaceId || selectedTask?.workspaceId
  const taskUsage = useSelector((state) =>
    state.tasks.usageByTaskId[resolvedTaskId] ?? null,
  )
  const llmRateLimitsById = useSelector((state) => state.llms.rateLimitsById)
  let rateLimits = taskUsage?.rateLimits ?? null
  if (!rateLimits && resolvedTask?.llmId) {
    rateLimits = llmRateLimitsById[resolvedTask.llmId] ?? null
  }

  useEffect(() => {
    if (!taskUsageQuery.data) {
      return
    }

    if (taskUsageQuery.data.taskId !== resolvedTaskId) {
      console.debug('Tasks received task usage for a different task', {
        resolvedTaskId,
        responseTaskId: taskUsageQuery.data.taskId,
      })
    }

    dispatch(
      taskActions.upsertTaskUsage(taskUsageQuery.data),
    )
  }, [ resolvedTaskId, taskUsageQuery.data ])

  useEffect(() => {
    if (!llmRateLimitsQuery.data) {
      return
    }

    if (!llmRateLimitsQuery.data.llmId) {
      console.debug('Tasks received rate limits without a llmId', {
        payload: llmRateLimitsQuery.data,
      })
      return
    }

    dispatch(
      llmActions.setLlmRateLimits(llmRateLimitsQuery.data),
    )
  }, [ llmRateLimitsQuery.data ])

  return <section className={`flex flex-1 min-h-0 flex-col bg-gradient-to-br
  from-slate-50 via-sky-50 to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800`}>
    <div className='flex min-h-0 flex-1 overflow-hidden'>
      <main className='min-h-0 flex-1 overflow-y-auto p-6'>
        {isTaskLoading && (
          <TaskView
            messages={[]}
            taskName={taskName}
            task={resolvedTask}
            containerName={taskContainerName}
            isLoading
            rateLimits={rateLimits}
          />
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
            task={resolvedTask}
            containerName={taskContainerName}
            rateLimits={rateLimits}
          />
        )}
      </main>
    </div>
  </section>
}
