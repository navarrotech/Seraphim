// Copyright © 2026 Jalapeno Labs

// Core
import { Link, Outlet, useLocation } from 'react-router-dom'

// Redux
import { useSelector } from '@frontend/framework/store'

// User interface
import { Alert, Button, Card } from '@heroui/react'
import { SettingsTabs } from './settings/SettingsTabs'

// Misc
import { getNextOnboardingStep, getOnboardingSteps } from './settings/onboardingFlow'

type OnboardingAlertCopy = {
  title: string
  description: string
}

function getOnboardingAlertCopy(label: string): OnboardingAlertCopy {
  return {
    title: `Complete onboarding: ${label}`,
    description: `You must setup at least one ${label} in order to proceed.`,
  }
}

export function Settings() {
  const location = useLocation()
  const llmCount = useSelector((reduxState) => reduxState.llms.items.length)
  const authAccountCount = useSelector((reduxState) => reduxState.accounts.items.length)
  const workspaceCount = useSelector((reduxState) => reduxState.workspaces.items.length)

  const onboardingSteps = getOnboardingSteps({
    llmCount,
    authAccountCount,
    workspaceCount,
  })
  const nextOnboardingStep = getNextOnboardingStep(onboardingSteps)
  const showNextButton = Boolean(
    nextOnboardingStep
    && location.pathname !== nextOnboardingStep.route,
  )

  let onboardingAlert = null
  if (nextOnboardingStep) {
    const copy = getOnboardingAlertCopy(nextOnboardingStep.label)
    onboardingAlert = <Alert
      color='warning'
      variant='flat'
      title={copy.title}
      description={copy.description}
    />
  }

  let nextButton = null
  if (showNextButton && nextOnboardingStep) {
    nextButton = <Button
      as={Link}
      to={nextOnboardingStep.route}
      color='primary'
    >
      <span>Next</span>
    </Button>
  }

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
      {nextOnboardingStep && <div className='relaxed'>
        <div className='level'>
          <div className='w-full'>{onboardingAlert}</div>
          <div>{nextButton}</div>
        </div>
      </div>}
      <Outlet />
    </main>
  </section>
}
