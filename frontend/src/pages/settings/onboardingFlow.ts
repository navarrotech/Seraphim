// Copyright © 2026 Jalapeno Labs

// Misc
import { UrlTree } from '@common/urls'

export type OnboardingCounts = {
  llmCount: number
  authAccountCount: number
  workspaceCount: number
}

export type OnboardingStep = {
  key: 'llms' | 'authAccounts' | 'workspaces'
  label: string
  route: string
  isComplete: boolean
}

export function getOnboardingSteps(counts: OnboardingCounts): OnboardingStep[] {
  return [
    {
      key: 'llms',
      label: 'LLM account',
      route: UrlTree.settingsLlms,
      isComplete: counts.llmCount > 0,
    },
    {
      key: 'authAccounts',
      label: 'git repo',
      route: UrlTree.settingsGitRepos,
      isComplete: counts.authAccountCount > 0,
    },
    {
      key: 'workspaces',
      label: 'workspace',
      route: UrlTree.settingsWorkspaces,
      isComplete: counts.workspaceCount > 0,
    },
  ]
}

export function getNextOnboardingStep(steps: OnboardingStep[]) {
  const nextIncompleteStep = steps.find((step) => !step.isComplete)

  if (!nextIncompleteStep) {
    return null
  }

  return nextIncompleteStep
}
