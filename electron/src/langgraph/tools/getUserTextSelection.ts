// Copyright © 2025 Jalapeno Labs

import type { ContextSnapshot } from '../types'

import { tool } from '@langchain/core/tools'
import { z } from 'zod'

export function getUserTextSelection(snapshot: Readonly<ContextSnapshot>) {
  return tool(
    async () => {
      return {
        focusedFilePath: snapshot.state.data?.activeVsCodeState?.focusedFilePath,
        userTextSelection: snapshot.state.data?.activeVsCodeState?.userTextSelection || []
      }
    },
    {
      name: 'getUserTextSelection',
      description: 'Return the user\'s text selection in VS Code, at the time of the request.',
      schema: z.object({})
    }
  )
}
