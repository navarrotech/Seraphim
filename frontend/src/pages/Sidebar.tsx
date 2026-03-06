// Copyright © 2026 Jalapeno Labs

// Core
import { NavLink, useLocation } from 'react-router'

// UI
import { Tooltip } from '@heroui/react'

// Misc
import { UrlTree } from '@common/urls'
import { SettingsIcon } from '@frontend/elements/graphics/IconNexus'
import { useSelector } from '@frontend/framework/store'

export function Sidebar() {
  const location = useLocation()
  const tasks = useSelector((state) => state.tasks.items)

  const isTaskScreen = location.pathname.startsWith(UrlTree.tasks)
  const recentTasks = tasks.slice(0, 5)

  return <aside className='flex min-h-screen w-16 flex-col items-center justify-between py-4 bg-white/20 backdrop-blur-lg'>
    <div className='flex w-full flex-col items-center gap-4'>
      <div className='flex items-center justify-center'>
        <img
          src='/brand/logo-64.png'
          alt='Seraphim logo'
          className='h-10 w-10 rounded-full'
        />
      </div>

      {!isTaskScreen && recentTasks.length > 0 && (
        <div className='flex flex-col gap-3 mt-4'>
          {recentTasks.map((task) => {
            const initial = task.name ? task.name.charAt(0).toUpperCase() : 'T'
            
            let colorClasses = 'bg-default-200 text-default-800 dark:bg-default-100 dark:text-default-foreground'
            const s = task.state
            if (s === 'Working' || s === 'Reviewing' || s === 'Validating') {
              colorClasses = 'bg-primary text-white'
            } else if (s === 'AwaitingReview') {
              colorClasses = 'bg-success text-white'
            } else if (s === 'ContainerBroken' || s === 'Failed') {
              colorClasses = 'bg-danger text-white'
            } else if (s === 'Creating' || s === 'SettingUp' || s === 'Halting' || s === 'Deleting') {
              colorClasses = 'bg-secondary text-secondary-foreground'
            }

            return (
              <Tooltip key={task.id} content={task.name || 'Untitled Task'} placement='right'>
                <NavLink
                  to={UrlTree.viewTask.replace(':taskId', task.id)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold shadow-sm transition-transform hover:scale-105 ${colorClasses}`}
                >
                  {initial}
                </NavLink>
              </Tooltip>
            )
          })}
        </div>
      )}
    </div>

    <div className='flex items-center justify-center'>
      <Tooltip content='Settings' placement='right'>
        <NavLink
          to={UrlTree.settings}
          className={({ isActive }) => 'p-2 rounded '
            + (isActive ? 'bg-primary text-white' : 'hover:bg-black/10 dark:hover:bg-white/10')}
        >
          <SettingsIcon size={22} />
        </NavLink>
      </Tooltip>
    </div>
  </aside>
}
