// Copyright © 2026 Jalapeno Labs

import type { TaskGitActionContext } from './types'

// Core
import { useState } from 'react'

// User interface
import { Button } from '@heroui/react'

// Misc
import { refreshTaskGit } from '@frontend/lib/routes/taskRoutes'

type Props = {
  context: TaskGitActionContext
}

export function RefreshGitButton(props: Props) {
  const { context } = props
  const [ isLoading, setIsLoading ] = useState<boolean>(false)

  async function handleClick() {
    console.debug('RefreshGitButton clicked', context)
    setIsLoading(true)

    try {
      const response = await refreshTaskGit(context.task.id)
      console.debug('RefreshGitButton response', response)
    }
    catch (error) {
      console.debug('RefreshGitButton request failed', {
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
    <span>Refresh git</span>
  </Button>
}
