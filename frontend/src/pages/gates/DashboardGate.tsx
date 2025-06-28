// Copyright © 2025 Jalapeno Labs

// Core
import { Outlet } from 'react-router'

export function DashboardGate() {
  return <div className='dashboard'>
    <main className='dashboard-content'>
      <section className='outlet container is-blurred'>
        <Outlet />
      </section>
    </main>
  </div>
}
