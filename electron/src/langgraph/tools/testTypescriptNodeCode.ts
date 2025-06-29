// Copyright © 2025 Jalapeno Labs

import type { ContextSnapshot } from '../types'

// Core
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// Node.js
import os from 'os'
import { runCommand } from '@common/node/process'
import { dirname, join } from 'path'
import { writeFile } from 'fs/promises'
import { unlinkSync } from 'fs'

// Utility
import { v7 as uuid } from 'uuid'
import { getWorkspaceExecutionDir } from '@common/node/getWorkspaceExecutionDir'

const schema = z.object({
  typescriptContent: z
    .string()
    .describe(
      'The raw typescript code to test, will be written directly to the temporary testing file.'
    )
})

// Write a temporary javascript file into the user's workspace
// And then run it using Node.js
// Capture the stdout and return it as a string
export function testTypescriptNodeCode(snapshot: ContextSnapshot) {
  return tool(
    async (args: z.infer<typeof schema>) => {
      const { typescriptContent } = args

      if (typescriptContent.includes('writeFile')) {
        throw new Error(
          'Writing files is prohibited in this tool.'
        )
      }

      if (typescriptContent.includes('process.env')) {
        throw new Error(
          'Accessing process.env is prohibited in this tool.'
        )
      }

      if (typescriptContent.includes('dotenv')) {
        throw new Error(
          'Accessing .env files via dotenv is prohibited in this tool.'
        )
      }

      if (typescriptContent.includes('child_process')) {
        throw new Error(
          'Accessing child_process is prohibited in this tool.'
        )
      }

      if (typescriptContent.includes('.env')) {
        throw new Error(
          'Accessing .env files is prohibited in this tool.'
        )
      }

      const focused = snapshot.state.data?.activeVsCodeState?.focusedFilePath
      const focusedDir = focused ? dirname(focused) : null

      const executionDir = getWorkspaceExecutionDir(focused)
        || snapshot.state.data?.activeVsCodeState?.workspacePaths[0]?.path
        || focusedDir
        || process.cwd()

      const tempFileName = uuid() + 'temp.ts'
      const tempFilePath = join(executionDir, tempFileName)
      try {
        await writeFile(tempFilePath, typescriptContent)
        const [ output, exitCode, fullCommand ] = await runCommand('tsx', [ tempFilePath ], {
          cwd: executionDir,
          // Security: we don't want to run this in a production environment
          env: {
            NODE_ENV: 'test'
          }
        })
        return {
          output,
          exitCode,
          fullCommand,
          executionDir
        }
      }
      finally {
        try {
          unlinkSync(tempFilePath)
        }
        catch {
          // Ignore errors
        }
      }
    },
    {
      name: 'testTypescriptNodeCode',
      description: 'Test ephemeral typescript node.js content for a result, runs raw typescript code with \'tsx\'.'
        + 'The tool will return all stdout & stderr output. Using write file commands are prohibited.'
        + `This will run in a temporary file in the root of the user's workspace, on ${os.platform()}.`,
      schema
    }
  )
}
