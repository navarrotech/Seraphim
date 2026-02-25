// Copyright © 2026 Jalapeno Labs

// UI
import { Background } from '@frontend/elements/Background'
import { Sidebar } from './Sidebar'
import { Outlet } from 'react-router'

export function AppOutlet() {
  return <div className='flex h-screen'>
    <Background />
    <Sidebar />
    <main className='level-centered items-start max-h-screen overflow-y-auto p-12 w-full gap-6'>
      <Outlet />
    </main>
  </div>
}
