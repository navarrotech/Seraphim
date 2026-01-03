// Copyright © 2026 Jalapeno Labs

// Core
import { Outlet } from 'react-router'

export function DashboardGate() {
  return <main className='full-canvas'>
    <Outlet />
  </main>
}
