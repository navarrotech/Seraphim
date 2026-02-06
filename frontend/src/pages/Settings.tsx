// Copyright © 2026 Jalapeno Labs

// Core
import { Outlet } from 'react-router-dom'

// User interface
import { Card } from '@heroui/react'
import { SettingsTabs } from './settings/SettingsTabs'

export function Settings() {
  return <section className='flex min-h-0 flex-1 overflow-hidden'>
    <aside className={`h-full w-64 shrink-0 border-r border-black/5 bg-white/50 p-4
    dark:border-white/10 dark:bg-slate-950/50`}>
      <Card className='p-3'>
        <h2 className='text-lg font-semibold'>Settings</h2>
        <p className='opacity-80 text-sm'>Choose a settings category.</p>
      </Card>
      <SettingsTabs />
    </aside>
    <main className='min-h-0 flex-1 overflow-y-auto p-6'>
      <Outlet />
    </main>
  </section>
}
