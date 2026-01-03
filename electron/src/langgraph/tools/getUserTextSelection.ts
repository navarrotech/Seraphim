// Copyright © 2026 Jalapeno Labs

import type { ContextSnapshot } from '../types'

import { tool } from '@langchain/core/tools'

export function getUserTextSelection(snapshot: Readonly<ContextSnapshot>) {
  return tool(
    async () => {
      const focusedFilePath = snapshot.state.data?.activeVsCodeState?.focusedFilePath
      const userTextSelection = snapshot.state.data?.activeVsCodeState?.userTextSelection || []

      if (!focusedFilePath || userTextSelection?.length === 0) {
        throw new Error('The user doesn\'t have any code selected in VS Code.')
      }

      return {
        focusedFilePath,
        userTextSelection,
      }
    },
    {
      name: 'getUserTextSelection',
      description: 'Return the user\'s text selection in VS Code, at the time of the request.',
    },
  )
}
