// Copyright © 2026 Jalapeno Labs

import type { Task, TaskState, Workspace } from '@prisma/client'
import type { ChipProps } from '@heroui/react'

// Core
import { Link, useLocation, useNavigate } from 'react-router-dom'

// Lib
import { useConfirm } from '@frontend/hooks/useConfirm'

// Redux
import { dispatch, useSelector } from '@frontend/framework/store'
import { taskActions } from '@frontend/framework/redux/stores/tasks'

// User interface
import { Button, Card, Chip, Tooltip } from '@heroui/react'

// Utility
import { startCase } from 'lodash-es'

// Misc
import { getTaskViewUrl, UrlTree } from '@common/urls'
import { archiveTask, deleteTask } from '@frontend/lib/routes/taskRoutes'
import {
  ArchiveIcon,
  DeleteIcon,
  PlusIcon,
  SettingsIcon,
} from '@frontend/common/IconNexus'

const TASK_STATE_COLOR_BY_STATE: Record<TaskState, ChipProps['color']> = {
  Creating: 'default',
  SettingUp: 'default',
  Working: 'primary',
  Validating: 'warning',
  Halting: 'warning',
  Reviewing: 'secondary',
  AwaitingReview: 'secondary',
  Failed: 'danger',
}

function getWorkspaceNameById(workspaces: Workspace[]) {
  const workspaceNameById = new Map<string, string>()

  for (const workspace of workspaces) {
    workspaceNameById.set(workspace.id, workspace.name)
  }

  return workspaceNameById
}

function isTaskState(taskState: string): taskState is TaskState {
  return taskState in TASK_STATE_COLOR_BY_STATE
}

function getTaskStateColor(taskState: string) {
  if (!isTaskState(taskState)) {
    console.debug('TasksSidebar received unknown task state, using default chip color', { taskState })
    return 'default'
  }

  const chipColor = TASK_STATE_COLOR_BY_STATE[taskState]

  if (!chipColor) {
    console.debug('TasksSidebar received unknown task state, using default chip color', { taskState })
    return 'default'
  }

  return chipColor
}

function getTaskStateLabel(taskState: string) {
  return startCase(taskState)
}

function getSelectedTaskId(pathname: string) {
  if (!pathname.startsWith('/tasks/')) {
    return undefined
  }

  const pathParts = pathname.split('/')
  return pathParts[2]
}

export function TasksSidebar() {
  const tasks = useSelector((state) => state.tasks.items)
  const workspaces = useSelector((state) => state.workspaces.items)
  const workspaceNameById = getWorkspaceNameById(workspaces)
  const location = useLocation()
  const selectedTaskId = getSelectedTaskId(location.pathname)
  const confirm = useConfirm()
  const navigate = useNavigate()

  function handleArchiveTask(task: Task) {
    if (!task?.id) {
      console.debug('TasksSidebar cannot archive task without an id', { task })
      return
    }

    confirm({
      title: 'Archive task?',
      message: `Archive "${task.name || 'Untitled task'}"? You can unarchive it later via API if needed.`,
      confirmText: 'Archive Task',
      confirmColor: 'warning',
      onConfirm: async function onConfirm() {
        try {
          await archiveTask(task.id)

          dispatch(
            taskActions.removeTasks([ task ]),
          )

          if (task.id === selectedTaskId) {
            navigate(UrlTree.tasksList)
          }
        }
        catch (error) {
          console.debug('TasksSidebar failed to archive task', { error, taskId: task.id })
        }
      },
    })
  }

  function handleDeleteTask(task: Task) {
    if (!task?.id) {
      console.debug('TasksSidebar cannot delete task without an id', { task })
      return
    }

    confirm({
      title: 'Delete task?',
      message: `Delete "${task.name || 'Untitled task'}"? This cannot be undone.`,
      confirmText: 'Delete Task',
      confirmColor: 'danger',
      onConfirm: async function onConfirm() {
        try {
          await deleteTask(task.id)

          dispatch(
            taskActions.removeTasks([ task ]),
          )

          if (task.id === selectedTaskId) {
            navigate(UrlTree.tasksList)
          }
        }
        catch (error) {
          console.debug('TasksSidebar failed to delete task', { error, taskId: task.id })
        }
      },
    })
  }

  return <aside className={`h-[100vh] w-72 shrink-0 border-r border-black/5 bg-white/70 p-4 backdrop-blur
  dark:border-white/10 dark:bg-slate-950/70`}>
    <div className='flex h-full flex-col'>
      <div className='relaxed'>
        <Button
          as={Link}
          to={UrlTree.tasksList}
          className='relaxed w-full justify-start'
          startContent={<PlusIcon />}
          color='primary'
        >
          <span>New Task</span>
        </Button>
        <div className='compact text-xs uppercase tracking-wide opacity-50'>Recent Tasks</div>
        <div className='relaxed space-y-2'>
          {tasks.length === 0 && (
            <Card className='p-3 dark:bg-slate-900/70'>
              <div className='text-sm opacity-70'>No tasks yet.</div>
            </Card>
          )}
          {tasks.map((task) => {
            const isActive = task.id === selectedTaskId

            return <Card
              key={task.id}
              className={`p-3 transition dark:bg-slate-900/60 ${
                isActive
                  ? 'border border-black/10 bg-white dark:border-white/10 dark:bg-slate-900'
                  : 'bg-white/50'
              }`}
            >
              <div className='level'>
                <Link to={getTaskViewUrl(task.id)} className='block min-w-0 flex-1'>
                  <div className='text-sm font-semibold truncate'>{task.name || 'Untitled task'}</div>
                  <div className='compact flex items-center gap-2'>
                    <Chip
                      size='sm'
                      variant='flat'
                      color={getTaskStateColor(task.state)}
                      className='max-w-full'
                    >
                      <span className='truncate'>{getTaskStateLabel(task.state)}</span>
                    </Chip>
                    <div className='min-w-0 text-xs opacity-60 truncate'>
                      {workspaceNameById.get(task.workspaceId) || 'Unknown workspace'}
                    </div>
                  </div>
                </Link>
                <div className='flex items-center'>
                  <Tooltip content='Archive Task'>
                    <div>
                      <Button
                        isIconOnly
                        variant='light'
                        onPress={() => {
                          handleArchiveTask(task)
                        }}
                        className='opacity-50 hover:opacity-100'
                      >
                        <span className='icon'>
                          <ArchiveIcon />
                        </span>
                      </Button>
                    </div>
                  </Tooltip>
                  <Tooltip content='Delete Task'>
                    <div>
                      <Button
                        isIconOnly
                        variant='light'
                        onPress={() => {
                          handleDeleteTask(task)
                        }}
                        className='opacity-50 hover:opacity-100'
                      >
                        <span className='icon'>
                          <DeleteIcon />
                        </span>
                      </Button>
                    </div>
                  </Tooltip>
                </div>
              </div>
            </Card>
          })}
        </div>
      </div>
      <div className='mt-auto pt-4'>
        <Button
          as={Link}
          to={UrlTree.settingsGeneral}
          variant='light'
          className='w-full justify-start'
          startContent={<SettingsIcon />}
        >
          <span>Settings</span>
        </Button>
      </div>
    </div>
  </aside>
}
