// Copyright © 2026 Jalapeno Labs

// Core
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from '@frontend/framework/store'
import { UrlTree } from '@common/urls'

// Misc
import { getNextOnboardingStep, getOnboardingSteps } from '../settings/onboardingFlow'

export function useOnboarding() {
  const location = useLocation()

  const llmsLength = useSelector((state) => state.llms.items.length)
  const accountsLength = useSelector((state) => state.accounts.items.length)
  const workspacesLength = useSelector((state) => state.workspaces.items.length)

  return useMemo(() => {
    const onboardingSteps = getOnboardingSteps({
      llmCount: llmsLength,
      authAccountCount: accountsLength,
      workspaceCount: workspacesLength,
    })

    const nextOnboardingStep = getNextOnboardingStep(onboardingSteps)

    const isValidOnboardingRoute = location.pathname.startsWith(UrlTree.settings)
      || location.pathname.startsWith(UrlTree.workspaceCreate)

    if (isValidOnboardingRoute) {
      return null
    }

    return nextOnboardingStep
  }, [ location.pathname, llmsLength, accountsLength, workspacesLength ])
}
