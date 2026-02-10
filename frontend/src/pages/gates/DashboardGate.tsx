// Copyright © 2026 Jalapeno Labs

// Core
import { Navigate, Outlet } from 'react-router'
import { useOnboarding } from '../settings/useOnboarding'

// UI
import { TasksSidebar } from '../tasks/TasksSidebar'

export function DashboardGate() {
  const nextOnboardingStep = useOnboarding()

  if (nextOnboardingStep) {
    console.debug('Redirecting to next onboarding step', { nextOnboardingStep })
    return <Navigate to={nextOnboardingStep.route} replace />
  }

  return <main className='flex min-h-screen max-h-[100vh] overflow-hidden'>
    <TasksSidebar />
    <div className='flex flex-1 min-h-0 overflow-y-auto'>
      <Outlet />
    </div>
  </main>
}
