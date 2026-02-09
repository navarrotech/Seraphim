// Copyright © 2026 Jalapeno Labs

import type { TaskGitActionContext } from './types'

// Core
import { useState } from 'react'

// User interface
import { Button } from '@heroui/react'

// Misc
import { createOrUpdateTaskPullRequest } from '@frontend/lib/routes/taskRoutes'

type Props = {
  context: TaskGitActionContext
}

export function CreateOrUpdatePullRequestButton(props: Props) {
  const { context } = props
  const [ isLoading, setIsLoading ] = useState<boolean>(false)

  let label = 'Create PR'
  if (context.task.pullRequestLink) {
    label = 'Update PR'
  }

  async function handleClick() {
    console.debug('CreateOrUpdatePullRequestButton clicked', context)
    setIsLoading(true)

    try {
      const response = await createOrUpdateTaskPullRequest(context.task.id)
      console.debug('CreateOrUpdatePullRequestButton response', response)
    }
    catch (error) {
      console.debug('CreateOrUpdatePullRequestButton request failed', {
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
    <span>{label}</span>
  </Button>
}
