// Copyright © 2026 Jalapeno Labs

import type { Task } from '@prisma/client'

// User interface
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from '@heroui/react'

// Misc
import { CreateOrUpdatePullRequestButton } from './CreateOrUpdatePullRequestButton'
import { RefreshGitButton } from './RefreshGitButton'
import { ReUpGitButton } from './ReUpGitButton'
import { ViewOnRepositoryButton } from './ViewOnRepositoryButton'

type Props = {
  task: Task
  provider?: string
}

function resolveGitProvider(provider?: string) {
  if (!provider) {
    console.debug('GitTaskDropdown did not receive a provider, defaulting to GitHub')
    return 'github'
  }

  return provider
}

export function GitTaskDropdown(props: Props) {
  const { task, provider } = props

  const context = {
    task,
    provider: resolveGitProvider(provider),
  }

  return <Dropdown placement='bottom-end'>
    <DropdownTrigger>
      <Button color='default' variant='flat'>
        <span>Git</span>
      </Button>
    </DropdownTrigger>
    <DropdownMenu
      aria-label='Git actions'
      variant='flat'
      closeOnSelect={false}
    >
      <DropdownSection>
        <DropdownItem key='refresh-git' textValue='Refresh git'>
          <RefreshGitButton context={context} />
        </DropdownItem>
        <DropdownItem key='re-up-git' textValue='Re-up git'>
          <ReUpGitButton context={context} />
        </DropdownItem>
        <DropdownItem key='create-or-update-pr' textValue='Create or update pull request'>
          <CreateOrUpdatePullRequestButton context={context} />
        </DropdownItem>
        <DropdownItem key='view-repository' textValue='View repository'>
          <ViewOnRepositoryButton context={context} />
        </DropdownItem>
      </DropdownSection>
    </DropdownMenu>
  </Dropdown>
}
