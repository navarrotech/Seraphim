// Copyright © 2026 Jalapeno Labs

import type { TaskGitActionContext } from './types'

// Core
import { useState } from 'react'

// User interface
import { Button } from '@heroui/react'

// Misc
import { reUpTaskGit } from '@frontend/lib/routes/taskRoutes'

type Props = {
  context: TaskGitActionContext
}

export function ReUpGitButton(props: Props) {
  const { context } = props
  const [ isLoading, setIsLoading ] = useState<boolean>(false)

  async function handleClick() {
    console.debug('ReUpGitButton clicked', context)
    setIsLoading(true)

    try {
      const response = await reUpTaskGit(context.task.id)
      console.debug('ReUpGitButton response', response)
    }
    catch (error) {
      console.debug('ReUpGitButton request failed', {
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
    <span>Re-up git</span>
  </Button>
}
