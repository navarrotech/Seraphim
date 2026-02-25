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
      <Tooltip content='Settings'>
        <NavLink to={UrlTree.settings} className='p-2 opacity-80'>
          <SettingsIcon size={22} />
        </NavLink>
      </Tooltip>
    </div>
  </aside>
}
