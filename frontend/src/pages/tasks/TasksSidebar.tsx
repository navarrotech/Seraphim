// Copyright © 2026 Jalapeno Labs

import type { Task, Workspace } from '@prisma/client'

// Core
import { Link } from 'react-router-dom'

// User interface
import { Button, Card } from '@heroui/react'

// Misc
import { getTaskViewUrl, UrlTree } from '@common/urls'
import { PlusIcon } from '@frontend/common/IconNexus'

type Props = {
  tasks: Task[]
  workspaces: Workspace[]
  selectedTaskId?: string
}

function getWorkspaceLabel(workspaces: Workspace[], workspaceId: string) {
  const workspace = workspaces.find((entry) => entry.id === workspaceId)
  return workspace?.name || 'Unknown workspace'
}

export function TasksSidebar(props: Props) {
  const { tasks, workspaces, selectedTaskId } = props

  return <aside className={`h-full w-72 shrink-0 border-r border-black/5 bg-white/70 p-4 backdrop-blur
  dark:border-white/10 dark:bg-slate-950/70`}>
    <Card className='relaxed p-3 dark:bg-slate-900/70'>
      <Button
        as={Link}
        to={UrlTree.tasksList}
        variant='solid'
        className='w-full justify-start'
        startContent={<PlusIcon />}
      >
        <span>New Task</span>
      </Button>
    </Card>
    <div className='relaxed text-xs uppercase tracking-wide opacity-50'>Recent Tasks</div>
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
          <Link to={getTaskViewUrl(task.id)} className='block'>
            <div className='text-sm font-semibold'>{task.name || 'Untitled task'}</div>
            <div className='text-xs opacity-60'>{getWorkspaceLabel(workspaces, task.workspaceId)}</div>
          </Link>
        </Card>
      })}
    </div>
  </aside>
}
