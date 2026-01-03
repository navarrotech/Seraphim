// Copyright © 2026 Jalapeno Labs

import type { ContextSnapshot } from '../types'

// Core
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// Utility
import { walkFilenameSearch } from '@common/node/walkFilenameSearch'
import { COMMON_EXCLUDE_FILES, FORBIDDEN_FILES } from '@common/constants'

const schema = z.object({
  searchPattern: z
    .string()
    .min(1, 'Search pattern is required.')
    .describe('The file name pattern to search for in the workspace files.'),
  exclude: z
    .array(z.string())
    .default([])
    .describe(
      'An array of additional directory names to exclude from the search.',
    ),
})

export function searchWorkspaceFiles(snapshot: Readonly<ContextSnapshot>) {
  return tool(
    async (args: z.infer<typeof schema>) => {
      const { searchPattern, exclude } = args

      const allExclude = [ ...COMMON_EXCLUDE_FILES, ...exclude ]

      return walkFilenameSearch(
        snapshot.state.data.activeVsCodeState.workspacePaths[0].path,
        searchPattern,
        allExclude,
        FORBIDDEN_FILES,
      )
    },
    {
      name: 'searchWorkspaceFiles',
      description: 'Search workspace files for all files matching a file name pattern.'
      + ' Returns an array of file paths.',
      schema,
    },
  )
}
