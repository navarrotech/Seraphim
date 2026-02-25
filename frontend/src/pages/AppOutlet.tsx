// Copyright © 2026 Jalapeno Labs

// Core
import { Outlet } from 'react-router'
import { HeroUIProviderCustom } from '@frontend/gates/HeroUiGate'
import { ToastProvider } from '@heroui/react'

// UI
import { Background } from '@frontend/elements/Background'
import { Sidebar } from './Sidebar'

export function AppOutlet() {
  return <HeroUIProviderCustom>
    <div className='flex h-screen'>
      <Background />
      <Sidebar />
      <main className='level-centered items-start max-h-screen overflow-y-auto p-12 w-full gap-6'>
        <Outlet />
      </main>
      <ToastProvider />
    </div>
  </HeroUIProviderCustom>
}
