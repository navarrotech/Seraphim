// Copyright © 2026 Jalapeno Labs

// Core
import { Link, Outlet, useLocation } from 'react-router-dom'

// Redux
import { useSelector } from '@frontend/framework/store'

// User interface
import { Alert, Button, Tooltip } from '@heroui/react'
import { SettingsTabs } from './settings/SettingsTabs'

// Misc
import { getNextOnboardingStep, getOnboardingSteps } from './settings/onboardingFlow'

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

  return <section className='flex flex-1 overflow-hidden'>
    <aside className='w-64 shrink-0 p-4'>
      <h2 className='text-lg font-semibold'>Settings</h2>
      <SettingsTabs />
    </aside>
    <main className='min-h-0 flex-1 overflow-y-auto p-6'>
      { nextOnboardingStep
        ? <div className='relaxed'>
          <div className='level'>
            <div className='w-full'>
              <Alert
                color='warning'
                variant='flat'
                title={`Complete onboarding: ${nextOnboardingStep.label}`}
                description={`You must setup at least one ${nextOnboardingStep.label} in order to proceed.`}
              >
                <Tooltip content={`You must setup at least one ${nextOnboardingStep.label} in order to proceed.`}>
                  <div>
                    <Button
                      as={Link}
                      to={nextOnboardingStep.route}
                      className='mt-2'
                      color='warning'
                      variant='bordered'
                      size='sm'
                      isDisabled={!showNextButton}
                      >
                      <span>Next</span>
                    </Button>
                  </div>
                </Tooltip>
              </Alert>
            </div>
          </div>
        </div>
        : <></>
      }
      <Outlet />
    </main>
  </section>
}
