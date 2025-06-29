// Copyright © 2025 Jalapeno Labs

import type { ContextSnapshot } from '../types'

// Core
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// Node.js
import { isPathInWorkspaces } from '../utility/isPathInWorkspaces'
import { readFile } from 'fs/promises'

const schema = z.object({
  filePath: z
    .string()
    .describe('The absolute path to the file to read.')
})

export function readFileTool(snapshot: ContextSnapshot) {
  return tool(
    async (args: z.infer<typeof schema>) => {
      const { filePath } = args

      // Safety check, ensure the file path is within a known workspace
      if (!isPathInWorkspaces(filePath, snapshot)) {
        throw new Error(`The file path ${filePath} requested is not within the user's workspace.`)
      }

      return await readFile(filePath, 'utf-8')
    },
    {
      name: 'readFile',
      description: 'Read content from a file in the project directory.',
      schema
    }
  )
}
