// Copyright © 2025 Jalapeno Labs

import type { ToolFactory, ContextSnapshot } from '../types'

// Core
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// Node.js
import { isPathInWorkspaces } from '../utility/isPathInWorkspaces'
import { readFileSafe } from '@common/node/readFileSafe'
import { dirname } from 'path'
import { writeFile } from 'fs/promises'
import { mkdirSync } from 'fs'

const schema = z.object({
  filePath: z
    .string()
    .describe('The absolute path to the file where content will be written.'),
  content: z
    .string()
    .describe('The content to write to the file')
    .min(1, 'Content must not be empty'),
  replace: z
    .boolean()
    .default(false)
    .describe('Should the content replace existing content? Defaults to false, which appends content at start line.'),
  startLine: z
    .number()
    .min(0)
    .optional()
    .describe('Optional, the file line number to start appending or replacing at. Defaults to 0'),
  endLine: z
    .number()
    .min(0)
    .optional()
    .describe('Optional, the file line number to replace at.')
})

export function writeToFile(snapshot: ContextSnapshot): ToolFactory {
  return tool(
    async (args: z.infer<typeof schema>) => {
      const { filePath, content, replace, startLine, endLine } = args

      // Safety check, ensure the file path is within a known workspace
      if (!isPathInWorkspaces(filePath, snapshot)) {
        throw new Error(`The file path ${filePath} requested is not within the user's workspace.`)
      }

      // Validate that endLine, if provided, is not before startLine
      if (typeof endLine === 'number' && typeof startLine === 'number' && endLine < startLine) {
        throw new Error('endLine must be greater than or equal to startLine')
      }

      mkdirSync(dirname(filePath), { recursive: true })
      const fileContents = await readFileSafe(filePath)

      if (!fileContents) {
        // If the file is empty just write the content
        await writeFile(filePath, content, 'utf-8')
        return 'Successfully wrote content to a new file at ' + filePath
      }

      if (!replace) {
        if (startLine === 0) {
          await writeFile(
            filePath,
            content + '\n' + fileContents,
            'utf-8'
          )
          return 'Successfully prepended content to file at ' + filePath
        }
      }

      // await writeFile(filePath, newContent, 'utf-8')
    },
    {
      name: 'writeToFile',
      description: 'Write content to a file in the project directory.',
      schema
    }
  )
}
