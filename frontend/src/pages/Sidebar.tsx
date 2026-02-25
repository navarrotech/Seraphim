// Copyright © 2026 Jalapeno Labs

// Core
import { NavLink } from 'react-router'

// UI
import { Tooltip } from '@heroui/react'

// Misc
import { UrlTree } from '@common/urls'
import { SettingsIcon } from '@frontend/elements/graphics/IconNexus'

export function Sidebar() {
  return <aside className='flex min-h-screen w-16 flex-col items-center justify-between py-6
    bg-white/20 backdrop-blur-lg'>
    <div className='flex items-center justify-center'>
      <img
        src='/brand/logo-64.png'
        alt='Seraphim logo'
        className='h-10 w-10 rounded-full'
      />
    </div>
    <div className='flex items-center justify-center'>
      <Tooltip content='Settings' placement='right'>
        <NavLink
          to={UrlTree.settings}
          className={({ isActive }) => 'p-2 rounded '
            + (isActive ? 'bg-primary' : 'hover:bg-black/10 dark:hover:bg-white/10')}
        >
          <SettingsIcon size={22} />
        </NavLink>
      </Tooltip>
    </div>
  </aside>
}
