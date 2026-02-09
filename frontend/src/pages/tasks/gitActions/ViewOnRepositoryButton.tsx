// Copyright © 2026 Jalapeno Labs

import type { TaskGitActionContext } from './types'

// Core
import { useState } from 'react'

// User interface
import { Button } from '@heroui/react'

// Misc
import { viewTaskRepository } from '@frontend/lib/routes/taskRoutes'

type Props = {
  context: TaskGitActionContext
}

function getViewOnRepositoryLabel(provider: string) {
  const normalizedProvider = provider.toLowerCase()

  if (normalizedProvider === 'github') {
    return 'View on GitHub'
  }

  if (normalizedProvider === 'gitlab') {
    return 'View on GitLab'
  }

  if (normalizedProvider === 'bitbucket') {
    return 'View on Bitbucket'
  }

  console.debug('ViewOnRepositoryButton received an unknown provider', {
    provider,
  })
  return 'View repository'
}

export function ViewOnRepositoryButton(props: Props) {
  const { context } = props
  const [ isLoading, setIsLoading ] = useState<boolean>(false)

  async function handleClick() {
    console.debug('ViewOnRepositoryButton clicked', context)
    setIsLoading(true)

    try {
      const response = await viewTaskRepository(context.task.id)
      console.debug('ViewOnRepositoryButton response', response)
    }
    catch (error) {
      console.debug('ViewOnRepositoryButton request failed', {
        error,
        context,
      })
    }
    finally {
      setIsLoading(false)
    }
  }

  return <Button
    size='sm'
    onPress={handleClick}
    isLoading={isLoading}
  >
    <span>{getViewOnRepositoryLabel(context.provider)}</span>
  </Button>
}
