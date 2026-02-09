// Copyright © 2026 Jalapeno Labs

import type { Task, Workspace } from '@prisma/client'

// Core
import { Link, useLocation, useNavigate } from 'react-router-dom'

// Lib
import { useConfirm } from '@frontend/hooks/useConfirm'

// Redux
import { dispatch, useSelector } from '@frontend/framework/store'
import { taskActions } from '@frontend/framework/redux/stores/tasks'

// User interface
import { Button, Card, Tooltip } from '@heroui/react'

// Misc
import { getTaskViewUrl, UrlTree } from '@common/urls'
import { deleteTask } from '@frontend/lib/routes/taskRoutes'
import {
  DeleteIcon,
  PlusIcon,
  SettingsIcon,
} from '@frontend/common/IconNexus'

function getWorkspaceLabel(workspaces: Workspace[], workspaceId: string) {
  const workspace = workspaces.find((entry) => entry.id === workspaceId)
  return workspace?.name || 'Unknown workspace'
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
  const location = useLocation()
  const selectedTaskId = getSelectedTaskId(location.pathname)
  const confirm = useConfirm()
  const navigate = useNavigate()

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
                  <div className='text-xs opacity-60 truncate'>
                    {getWorkspaceLabel(workspaces, task.workspaceId)}
                  </div>
                </Link>
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
