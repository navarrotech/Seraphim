// Copyright © 2025 Jalapeno Labs

import type { ToolFactory, ContextSnapshot } from '../types'

// Core
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// Node.js
import { extractFunctionTsMorph } from '@common/node/extractFunctionTsMorph'
import { extractExportTsMorph } from '@common/node/extractExportTsMorph'
import { isPathInWorkspaces } from '../utility/isPathInWorkspaces'
import { readFileSafe } from '@common/node/readFileSafe'

const schema = z.object({
  filePath: z
    .string()
    .describe('The absolute path to the file you wish to read.'),
  filterExports: z
    .array(z.string())
    .max(5)
    .optional()
    .describe(
      'Optional, an array of exported string names to filter the response by.'
      + ' Useful for large files with multiple exports.'
    )
})

export function readSourceCodeFile(snapshot: ContextSnapshot): ToolFactory {
  return tool(
    async (args: z.infer<typeof schema>) => {
      const { filePath, filterExports } = args

      // Safety check, ensure the file path is within a known workspace
      if (!isPathInWorkspaces(filePath, snapshot)) {
        throw new Error(`The file path ${filePath} requested is not within the user's workspace.`)
      }

      const fileContents = await readFileSafe(filePath)
      if (fileContents === null) {
        throw new Error(`The file at ${filePath} does not exist.`)
      }

      if (!filterExports?.length) {
        return {
          filePath,
          content: fileContents
        }
      }

      const results: string[] = []
      for (const exportName of filterExports) {
        const extractedFunction = extractFunctionTsMorph(fileContents, exportName)

        // If it's a function, awesome it will be returned super easily:
        if (extractedFunction) {
          results.push(extractedFunction)
          continue
        }
        results.push(
          extractExportTsMorph(fileContents, exportName)
        )
      }

      return {
        filePath,
        exports: results
      }
    },
    {
      name: 'readSourceCodeFile',
      description: 'Read the source code from a file at a specified path.',
      schema
    }
    // TODO: Fix types?
  ) as any
}
