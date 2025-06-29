// Copyright © 2025 Jalapeno Labs

import type { ContextSnapshot } from '../types'

// Core
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// Node.js
import { isPathInWorkspaces } from '../utility/isPathInWorkspaces'
import { writeFile, readFile } from 'fs/promises'

const schema = z.object({
  filePath: z
    .string()
    .describe('The absolute path to the file where content will be written.'),
  find: z
    .string()
    .min(1)
    .describe('The old text to replace in the file, must be exactly matched.'),
  replace: z
    .string()
    .describe('The new content to replace the found text with.')
    .min(1)
})

export function findAndReplaceTextInFile(snapshot: ContextSnapshot) {
  return tool(
    async (args: z.infer<typeof schema>) => {
      const { filePath, find, replace } = args

      // Safety check, ensure the file path is within a known workspace
      if (!isPathInWorkspaces(filePath, snapshot)) {
        throw new Error('The file path requested is not within the user\'s workspace.')
      }

      const fileContents = await readFile(filePath, 'utf-8')

      if (fileContents === null) {
        throw new Error('File at is empty or could not be read.')
      }

      if (!fileContents.includes(find)) {
        throw new Error('The find text was not found in the target file at.')
      }

      const newContent = fileContents.replace(find, replace)
      await writeFile(filePath, newContent, 'utf-8')

      return 'Successfully replaced the found text, with the replaced text in the file.'
    },
    {
      name: 'findAndReplaceTextInFile',
      description: 'Find and replace text in a file.',
      schema
    }
  )
}
